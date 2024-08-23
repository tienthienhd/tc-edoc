import io
import json
import logging
import math
import os
import re
import shutil
import tempfile
from pathlib import Path
import time
from typing import TYPE_CHECKING
from typing import Optional

from django.conf import settings
import requests
from PyPDF2 import PdfReader
from PyPDF2.errors import PdfReadError
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter
from PIL import Image
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfbase import pdfmetrics
from pdf2image import convert_from_path
from reportlab.lib.utils import ImageReader

from documents.parsers import DocumentParser
from documents.parsers import ParseError
from documents.parsers import make_thumbnail_from_pdf
from documents.utils import maybe_override_pixel_limit
from documents.utils import run_subprocess
from paperless.config import OcrConfig
from paperless.models import ApplicationConfiguration, ArchiveFileChoices
from paperless.models import CleanChoices
from paperless.models import ModeChoices


class NoTextFoundException(Exception):
    pass


class RtlLanguageException(Exception):
    pass


class RasterisedDocumentCustomParser(DocumentParser):
    """
    This parser uses Tesseract to try and get some text out of a rasterised
    image, whether it's a PDF, or other graphical format (JPEG, TIFF, etc.)
    """

    logging_name = "edoc.parsing.pdf"

    def get_settings(self) -> OcrConfig:
        """
        This parser uses the OCR configuration settings to parse documents
        """
        return OcrConfig()

    def extract_metadata(self, document_path, mime_type):
        result = []
        if mime_type == "application/pdf":
            import pikepdf

            namespace_pattern = re.compile(r"\{(.*)\}(.*)")

            pdf = pikepdf.open(document_path)
            meta = pdf.open_metadata()
            for key, value in meta.items():
                if isinstance(value, list):
                    value = " ".join([str(e) for e in value])
                value = str(value)
                try:
                    m = namespace_pattern.match(key)
                    if m is None:  # pragma: no cover
                        continue
                    namespace = m.group(1)
                    key_value = m.group(2)
                    try:
                        namespace.encode("utf-8")
                        key_value.encode("utf-8")
                    except UnicodeEncodeError as e:  # pragma: no cover
                        self.log.debug(f"Skipping metadata key {key}: {e}")
                        continue
                    result.append(
                        {
                            "namespace": namespace,
                            "prefix": meta.REVERSE_NS[namespace],
                            "key": key_value,
                            "value": value,
                        },
                    )
                except Exception as e:
                    self.log.warning(
                        f"Error while reading metadata {key}: {value}. Error: {e}",
                    )
        return result

    def get_thumbnail(self, document_path, mime_type, file_name=None):
        return make_thumbnail_from_pdf(
            self.archive_path or document_path,
            self.tempdir,
            self.logging_group,
        )

    def is_image(self, mime_type) -> bool:
        return mime_type in [
            "image/png",
            "image/jpeg",
            "image/tiff",
            "image/bmp",
            "image/gif",
            "image/webp",
        ]

    def has_alpha(self, image) -> bool:
        with Image.open(image) as im:
            return im.mode in ("RGBA", "LA")

    def remove_alpha(self, image_path: str) -> Path:
        no_alpha_image = Path(self.tempdir) / "image-no-alpha"
        run_subprocess(
            [
                settings.CONVERT_BINARY,
                "-alpha",
                "off",
                image_path,
                no_alpha_image,
            ],
            logger=self.log,
        )
        return no_alpha_image

    def get_dpi(self, image) -> Optional[int]:
        try:
            with Image.open(image) as im:
                x, y = im.info["dpi"]
                return round(x)
        except Exception as e:
            self.log.warning(
                f"Error while getting DPI from image {image}: {e}")
            return None

    def calculate_a4_dpi(self, image) -> Optional[int]:
        try:
            with Image.open(image) as im:
                width, height = im.size
                # divide image width by A4 width (210mm) in inches.
                dpi = int(width / (21 / 2.54))
                self.log.debug(
                    f"Estimated DPI {dpi} based on image width {width}")
                return dpi

        except Exception as e:
            self.log.warning(
                f"Error while calculating DPI for image {image}: {e}")
            return None

    # call api
    def call_ocr_api_with_retries(self, method, url, headers, params, payload,
                                  max_retries=5, delay=5, timeout=100,
                                  status_code_success=[200],
                                  status_code_fail=[],data_compare={}):
        retries = 0
        data_ocr = None
        while retries < max_retries:
            try:
                response_ocr = requests.request(method, url, headers=headers,
                                                params=params, data=payload,
                                                timeout=timeout,)
                if response_ocr.status_code in status_code_success:
                    flag=False
                    for key,value in data_compare.items():
                        if response_ocr.json().get(key,None) == value:
                            flag=True
                            break
                    if flag:
                        retries += 1
                        time.sleep(delay)
                    else:
                        return response_ocr.json()
                if response_ocr.status_code in status_code_fail :
                    return False
                else:
                    logging.error('OCR error response: %s', response_ocr.json())
                    retries += 1
                    time.sleep(delay)
            except requests.exceptions.Timeout:
                logging.warning('OCR request timed out. Retrying...')
                retries += 1
                time.sleep(delay)
            except requests.exceptions.RequestException as e:
                logging.error('OCR request failed: %s', e)
                retries += 1
                time.sleep(delay)

        logging.error('Max retries reached. OCR request failed.')
        return None

    def get_token_ocr_field_by_refresh_token(self, **args):
        # check token
        headers = {
            'Content-Type': 'application/json'
        }
        payload = json.dumps({
            "refresh": f"{args.get('refresh_token_ocr')}"
        })
        token = self.call_ocr_api_with_retries("POST",
                                               args.get('api_refresh_ocr'),
                                               headers,
                                               params={},
                                               payload=payload,
                                               max_retries=2,
                                               delay=5,
                                               timeout=20,
                                               status_code_fail=[401])
        if token == False:
            token = self.login_ocr_field(**args)
            if token is not None:
                payload = json.dumps({
                    "refresh": f"{args.get('refresh_token_ocr_field')}",
                })

                token = self.call_ocr_api_with_retries("POST", args.get(
                    'api_refresh_ocr_field'),
                                                       headers={},
                                                       params={},
                                                       payload=payload,
                                                       max_retries=2,
                                                       delay=5,
                                                       timeout=20)

        return token

    def login_ocr_field(self, **args):
        # check token
        headers = {
            'Content-Type': 'application/json'
        }
        payload = json.dumps({
            "username": f"{args.get('username_ocr')}",
            "password": f"{args.get('password_ocr')}"
        })
        return self.call_ocr_api_with_retries("POST",
                                              args.get('api_login_ocr'),
                                              headers,
                                              params={},
                                              payload=payload,
                                              max_retries=2,
                                              delay=5,
                                              timeout=20)

    def login_ocr(self, **args):
        # check token
        payload = f"username={args.get('username_ocr')}&password={args.get('password_ocr')}"
        headers = {
            'Content-Type': 'application/x-www-form-urlencoded'
        }

        return self.call_ocr_api_with_retries("POST",
                                              args.get('api_login_ocr'),
                                              headers=headers,
                                              params={},
                                              payload=payload,
                                              max_retries=2,
                                              delay=5,
                                              timeout=20)

    # login
    # get token and save token to database
    # ocr data
    # ocr field
    def ocr_file(self, path_file, **args):
        # data general
        data_ocr = None
        data_ocr_fields = None
        form_code = ""
        file_id = ""
        request_id = ""
        app_config = ApplicationConfiguration.objects.filter().first()

         # count page number
        page_count = 1
        try:
            with open(path_file, 'rb') as f:
                pdf_reader = PdfReader(f)
                page_count = len(pdf_reader.pages)
        except (OSError, IOError, ValueError, PdfReadError):
            pass
        # check token
        try:

            app_config: ApplicationConfiguration | None
            access_token_ocr = args.get("access_token_ocr", 'None')

            # login API custom-field
            if len(args) == 0 and args.get('form_code') == '':
                return data_ocr, data_ocr_fields, form_code
                # login for the first time ...
            if access_token_ocr == '':
                token = self.login_ocr_field(**args)
                if token is not None:
                    args["access_token_ocr"] = token['access']
                    app_config.user_args[
                        "access_token_ocr"] = token['access']
                    args["refresh_token_ocr"] = token['refresh']
                    app_config.user_args[
                        "refresh_token_ocr"] = token['refresh']
                    app_config.save()

            # upload file -------------------
            get_file_id = ''
            url_upload_file = args.get("api_upload_file_ocr", "")
            headers = {
                'Authorization': f"Bearer {args.get('access_token_ocr')}"
            }
            pdf_data = None
            with open(path_file, 'rb') as file:
                pdf_data = file.read()
            payload = {'title': (str(path_file).split("/")[-1]),
                       'folder': '1',
                       'extract': '1'}
            response_upload = requests.post(url_upload_file, data=payload,
                                            files={
                                                'file': (
                                                str(path_file).split("/")[-1],
                                                pdf_data)},
                                            headers=headers)

            if response_upload.status_code == 201:
                get_file_id = response_upload.json().get('id', '')

                # else :
                #     # logging.error('upload file: ', response_upload.status_code)
                #     return data_ocr, data_ocr_fields, form_code

                # ocr by file_id --------------------------
                params = {'file_id': get_file_id}
                url_ocr_pdf_by_fileid = args.get("api_ocr_by_file_id", None)
                data_ocr_general = self.call_ocr_api_with_retries("GET",
                                                                url_ocr_pdf_by_fileid,
                                                                headers, params,
                                                                {},max_retries = 5,
                                                                delay=page_count * 3,
                                                                timeout=30,data_compare={'status_code':1})

                if data_ocr_general is not None:

                    data_ocr = data_ocr_general.get('response', None)
                    enable_ocr_field = args.get("enable_ocr_field",False)
                    url_ocr_pdf_custom_field_by_fileid = args.get("api_ocr_field",False)
                    if not enable_ocr_field and not url_ocr_pdf_custom_field_by_fileid:
                        return (data_ocr, data_ocr_fields, form_code)
                    # peeling field
                    get_request_id = data_ocr_general.get('request_id', None)

                    for i in app_config.user_args.get("form_code", []):
                        payload = json.dumps({
                            "request_id": f"{get_request_id}",
                            "list_form_code": [
                                f"{i.get('name')}"
                            ],
                            "is_single_form": True
                        })
                        headers = {
                            'Authorization': f"Bearer {args['access_token_ocr']}",
                            'Content-Type': 'application/json'
                        }
                        data_ocr_fields = self.call_ocr_api_with_retries("POST",
                                                                        url_ocr_pdf_custom_field_by_fileid,
                                                                        headers,
                                                                        params,
                                                                        payload, 5, 5,
                                                                        100,
                                                                        status_code_fail=[
                                                                            401])

                        if not isinstance(data_ocr_fields, list):
                            continue
                        if data_ocr_fields[0].get("id") != -1:
                            form_code = i.get('name')
                            break
        except Exception as e:
            self.log.error("error", e)

        return (data_ocr, data_ocr_fields, form_code,file_id,request_id)

    # get ocr file img/pdf
    # def ocr_file(self, path_file, **args):
    #         data_ocr = None
    #         data_ocr_fields = None
    #         form_code = ""
    #         try:
    #
    #             application_configuration=ApplicationConfiguration.objects.filter().first()
    #             application_configuration: ApplicationConfiguration|None
    #             access_token_ocr=args.get("access_token_ocr",None)
    #
    #             if access_token_ocr == '':
    #                 access_token_ocr = self.login_ocr(**args)
    #                 if access_token_ocr is not None:
    #                     application_configuration.user_args["access_token_ocr"]=access_token_ocr['access_token']
    #                     args["access_token_ocr"]=access_token_ocr['access_token']
    #
    #             # upload file
    #             get_file_id = ''
    #             url_upload_file = args.get("api_upload_file_ocr","")
    #             headers = {
    #                 'Authorization': f"Bearer {args.get('access_token_ocr')}"
    #             }
    #             pdf_data = None
    #             with open(path_file, 'rb') as file:
    #                 pdf_data = file.read()
    #
    #             response_upload = requests.post(url_upload_file, files={'file': (str(path_file).split("/")[-1], pdf_data)}, headers=headers)
    #             if response_upload.status_code == 200:
    #                 get_file_id = response_upload.json().get('file_id','')
    #             else:
    #                 logging.error('upload file: ',response_upload.status_code)
    #
    #             # ocr by file_id
    #             params = {'file_id': get_file_id}
    #             url_ocr_pdf_by_fileid = args.get("api_ocr_by_file_id",None)
    #             data_ocr = self.call_ocr_api_with_retries("POST",url_ocr_pdf_by_fileid, headers, params, {}, 5, 5, 100)
    #
    #             # login API custom-field
    #             if len(args)>0 and args.get('form_code') != '':
    #                 # login for the first time ...
    #                 access_token = args.get("access_token_ocr_field",'')
    #                 if access_token == '':
    #                     token = self.login_ocr_field(**args)
    #                     if token is not None:
    #                         args["access_token_ocr_field"]=token['access']
    #                         application_configuration.user_args["access_token_ocr_field"]=token['access']
    #                         args["refresh_token_ocr_field"]=token['refresh']
    #                         application_configuration.user_args["refresh_token_ocr_field"]=token['refresh']
    #                         application_configuration.save()
    #                 url_ocr_pdf_custom_field_by_fileid = args.get("api_ocr_field")
    #                 for i in application_configuration.user_args.get("form_code", []):
    #                     payload = json.dumps({
    #                     "request_id": f"{get_file_id}",
    #                     "list_form_code": [
    #                         f"{i.get('name')}"
    #                     ]
    #                     })
    #                     headers = {
    #                         'Authorization': f"Bearer {args['access_token_ocr_field']}",
    #                         'Content-Type': 'application/json'
    #                     }
    #                     data_ocr_fields = self.call_ocr_api_with_retries("POST",url_ocr_pdf_custom_field_by_fileid, headers, params, payload, 5, 5, 100,status_code_fail=[401])
    #
    #                     # if token expire or WRONG
    #                     if data_ocr_fields == False:
    #                         token = self.get_token_ocr_field_by_refresh_token(**args)
    #                         if token is not None and token != False:
    #                             args["access_token_ocr_field"]=token['access']
    #                             args["refresh_token_ocr_field"]=token['refresh']
    #                             application_configuration.user_args["access_token_ocr_field"]=token['access']
    #                             application_configuration.user_args["refresh_token_ocr_field"]=token['refresh']
    #                             application_configuration.save()
    #
    #                             # repeat ocr_field
    #                             payload = json.dumps({
    #                             "request_id": f"{get_file_id}",
    #                             "list_form_code": [
    #                                 f"{args.get('form_code')}"
    #                             ]
    #                             })
    #                             headers = {
    #                                 'Authorization': f"Bearer {args.get('access_token_ocr_field')}",
    #                                 'Content-Type': 'application/json'
    #                             }
    #                             data_ocr_fields = self.call_ocr_api_with_retries("POST",url_ocr_pdf_custom_field_by_fileid, headers, params, payload, 5, 5, 100,status_code_fail=[401])
    #                     if isinstance(data_ocr_fields,list)==False:
    #                         continue
    #                     if data_ocr_fields[0].get("id")!=-1:
    #                         form_code=i.get('name')
    #                         break
    #         except Exception as e:
    #             self.log.error("error",e)
    #         return (data_ocr,data_ocr_fields,form_code)

    def render_pdf_ocr(self, sidecar, mime_type, input_path, output_path,
                       data_ocr):
        font_name = 'Arial'
        data = data_ocr or {}

        font_path = os.path.join(os.path.dirname(os.path.abspath(__file__)),
                                 'fonts', 'arial-font/arial.ttf')
        with open(sidecar, "w") as txt_sidecar:
            txt_sidecar.write(data.get("content", ""))
        if self.is_image(mime_type):
            img = Image.open(input_path)
            width, height = img.size
            c = canvas.Canvas(str(output_path), pagesize=(width, height))
            pdfmetrics.registerFont(TTFont(font_name, font_path))
            # c.drawImage(input_path, 0, 0, width=width, height=height)
            for page in data.get("pages",{}):
                for block in page["blocks"]:
                    for line in block.get("lines", []):
                        y1 = line.get("bbox")[0][1]
                        y2 = line.get("bbox")[1][1]
                        font_size = math.floor((y2 - y1) * 72 / 96)
                        y_center_coordinates = y2 - (y2 - y1) / 2
                        for word in line.get("words", []):
                            x1 = word["bbox"][0][0]
                            # y1 = word["bbox"][0][1]
                            x2 = word["bbox"][1][0]
                            # y2 = word["bbox"][1][1]
                            value = word["value"]
                            # font_size = math.ceil(float(y2-y1) * 72 / 96)
                            # font_size = (y2-y1) * 72 / 96
                            x_center_coordinates = x2 - (x2 - x1) / 2
                            # y_center_coordinates =y2 - (y2-y1)/2
                            w = c.stringWidth(value, font_name, font_size)
                            c.setFont('Arial', font_size)
                            c.drawString(x_center_coordinates - w / 2,
                                         height - y_center_coordinates - (
                                                 font_size / 2),
                                         value)
            c.drawImage(input_path, 0, 0, width=width, height=height)
            c.save()
        else:
            shutil.copy(str(input_path), str(output_path))
            if len(data)<1:
                return
            input_pdf = PdfReader(input_path)
            images = convert_from_path(input_path,
                                       first_page=1,
                                       last_page=input_pdf.getNumPages() + 1)
            can = canvas.Canvas(str(output_path), pagesize=letter)
            for page_num, page in enumerate(input_pdf.pages):
                page_height = page.mediabox.getHeight()
                page_width = page.mediabox.getWidth()
                width_api_img = data["pages"][page_num]["dimensions"][1]
                height_api_img = data["pages"][page_num]["dimensions"][0]
                # set size new page
                if width_api_img < height_api_img and page_height < page_width:
                    page_height, page_width = page_width, page_height
                can.setPageSize((page_width, page_height))
                byte_image = io.BytesIO()
                images[page_num].save(byte_image, format='JPEG')
                jpg_image = byte_image.getvalue()
                # can.drawImage(ImageReader(io.BytesIO(jpg_image)),
                #               0, 0,
                #               width=float(page_width),
                #               height=float(page_height))
                # set font size
                pdfmetrics.registerFont(TTFont('Arial', font_path))
                # print(f'kich thuoc goc: height{page_height}, width{page_width}, kich thuoc api: height{height_api_img} width{width_api_img}')
                rolate_height = height_api_img / page_height
                rolate_width = width_api_img / page_width
                for block in data["pages"][page_num]["blocks"]:
                    for line in block.get("lines", []):
                        y1_line = (
                                line.get("bbox")[0][1] / float(rolate_height))
                        y2_line = (
                                line.get("bbox")[1][1] / float(rolate_height))

                        y_center_coordinates = y2_line - (
                                y2_line - y1_line) / 2
                        for word in line.get("words", []):
                            x1 = word["bbox"][0][0] / float(rolate_width)
                            y1 = word["bbox"][0][1] / float(rolate_height)
                            x2 = word["bbox"][1][0] / float(rolate_width)
                            y2 = word["bbox"][1][1] / float(rolate_height)
                            font_size = math.floor((y2 - y1) * 72 / 96)
                            value = word["value"]
                            # font_size = float(y2-y1) * 72 / 96
                            x_center_coordinates = x2 - (x2 - x1) / 2
                            # y_center_coordinates =y2 - (y2-y1)/2
                            # value=' '+value+' '
                            w = can.stringWidth(value, font_name, font_size)
                            can.setFont('Arial', font_size)
                            can.drawString(int(x_center_coordinates - w / 2),
                                           int(float(
                                               page_height) - y_center_coordinates - (
                                                       font_size / 2)) + 2,
                                           value)
                can.drawImage(ImageReader(io.BytesIO(jpg_image)),
                              0, 0,
                              width=float(page_width),
                              height=float(page_height))
                can.showPage()
            can.save()

    def ocr_img_or_pdf(self, document_path, mime_type, sidecar, output_file,
                       **kwargs):
        data_ocr=None
        data_ocr_fields=None
        form_code=None
        file_id=""
        request_id=""
        data_ocr, data_ocr_fields, form_code, file_id, request_id = self.ocr_file(document_path,
                                                             **kwargs)
        self.render_pdf_ocr(sidecar, mime_type, document_path, output_file,
                            data_ocr)
        return data_ocr, data_ocr_fields, form_code, file_id, request_id

    def extract_text(
        self,
        sidecar_file: Optional[Path],
        pdf_file: Path,
    ) -> Optional[str]:
        # When re-doing OCR, the sidecar contains ONLY the new text, not
        # the whole text, so do not utilize it in that case
        if (
            sidecar_file is not None
            and os.path.isfile(sidecar_file)
            and self.settings.mode != "redo"
        ):
            text = self.read_file_handle_unicode_errors(sidecar_file)

            if "[OCR skipped on page" not in text:
                # This happens when there's already text in the input file.
                # The sidecar file will only contain text for OCR'ed pages.
                self.log.debug("Using text from sidecar file")
                return post_process_text(text)
            else:
                self.log.debug("Incomplete sidecar file: discarding.")

        # no success with the sidecar file, try PDF

        if not os.path.isfile(pdf_file):
            return None

        try:
            text = None
            with tempfile.NamedTemporaryFile(
                mode="w+",
                dir=self.tempdir,
            ) as tmp:
                run_subprocess(
                    [
                        "pdftotext",
                        "-q",
                        "-layout",
                        "-enc",
                        "UTF-8",
                        pdf_file,
                        tmp.name,
                    ],
                    logger=self.log,
                )
                text = self.read_file_handle_unicode_errors(Path(tmp.name))

            return post_process_text(text)

        except Exception:
            #  If pdftotext fails, fall back to OCR.
            self.log.warning(
                "Error while getting text from PDF document with pdftotext",
                exc_info=True,
            )
            # probably not a PDF file.
            return None

    def construct_ocrmypdf_parameters(
        self,
        input_file,
        mime_type,
        output_file,
        sidecar_file,
        safe_fallback=False,
    ):
        if TYPE_CHECKING:
            assert isinstance(self.settings, OcrConfig)
        ocrmypdf_args = {
            "input_file": input_file,
            "output_file": output_file,
            # need to use threads, since this will be run in daemonized
            # processes via the task library.
            "use_threads": True,
            "jobs": settings.THREADS_PER_WORKER,
            "language": self.settings.language,
            "output_type": self.settings.output_type,
            "progress_bar": False,
        }

        if "pdfa" in ocrmypdf_args["output_type"]:
            ocrmypdf_args["color_conversion_strategy"] = (
                self.settings.color_conversion_strategy
            )

        if self.settings.mode == ModeChoices.FORCE or safe_fallback:
            ocrmypdf_args["force_ocr"] = True
        elif self.settings.mode in {
            ModeChoices.SKIP,
            ModeChoices.SKIP_NO_ARCHIVE,
        }:
            ocrmypdf_args["skip_text"] = True
        elif self.settings.mode == ModeChoices.REDO:
            ocrmypdf_args["redo_ocr"] = True
        else:  # pragma: no cover
            raise ParseError(f"Invalid ocr mode: {self.settings.mode}")

        if self.settings.clean == CleanChoices.CLEAN:
            ocrmypdf_args["clean"] = True
        elif self.settings.clean == CleanChoices.FINAL:
            if self.settings.mode == ModeChoices.REDO:
                ocrmypdf_args["clean"] = True
            else:
                # --clean-final is not compatible with --redo-ocr
                ocrmypdf_args["clean_final"] = True

        if self.settings.deskew and self.settings.mode != ModeChoices.REDO:
            # --deskew is not compatible with --redo-ocr
            ocrmypdf_args["deskew"] = True

        if self.settings.rotate:
            ocrmypdf_args["rotate_pages"] = True
            ocrmypdf_args[
                "rotate_pages_threshold"] = self.settings.rotate_threshold

        if self.settings.pages is not None and self.settings.pages > 0:
            ocrmypdf_args["pages"] = f"1-{self.settings.pages}"
        else:
            # sidecar is incompatible with pages
            ocrmypdf_args["sidecar"] = sidecar_file

        if self.is_image(mime_type):
            # This may be required, depending on the known imformation
            maybe_override_pixel_limit()

            dpi = self.get_dpi(input_file)
            a4_dpi = self.calculate_a4_dpi(input_file)

            if self.has_alpha(input_file):
                self.log.info(
                    f"Removing alpha layer from {input_file} "
                    "for compatibility with img2pdf",
                )
                # Replace the input file with the non-alpha
                ocrmypdf_args["input_file"] = self.remove_alpha(input_file)

            if dpi:
                self.log.debug(f"Detected DPI for image {input_file}: {dpi}")
                ocrmypdf_args["image_dpi"] = dpi
            elif self.settings.image_dpi is not None:
                ocrmypdf_args["image_dpi"] = self.settings.image_dpi
            elif a4_dpi:
                ocrmypdf_args["image_dpi"] = a4_dpi
            else:
                raise ParseError(
                    f"Cannot produce archive PDF for image {input_file}, "
                    f"no DPI information is present in this image and "
                    f"OCR_IMAGE_DPI is not set.",
                )
            if ocrmypdf_args["image_dpi"] < 70:  # pragma: no cover
                self.log.warning(
                    f"Image DPI of {ocrmypdf_args['image_dpi']} is low, OCR may fail",
                )

        if self.settings.user_args is not None:
            try:
                ocrmypdf_args = {**ocrmypdf_args, **self.settings.user_args}
            except Exception as e:
                self.log.warning(
                    f"There is an issue with PAPERLESS_OCR_USER_ARGS, so "
                    f"they will not be used. Error: {e}",
                )

        if (
            self.settings.max_image_pixel is not None
            and self.settings.max_image_pixel >= 0
        ):
            # Convert pixels to mega-pixels and provide to ocrmypdf
            max_pixels_mpixels = self.settings.max_image_pixel / 1_000_000.0
            msg = (
                "OCR pixel limit is disabled!"
                if max_pixels_mpixels == 0
                else f"Calculated {max_pixels_mpixels} megapixels for OCR"
            )
            self.log.debug(msg)
            ocrmypdf_args["max_image_mpixels"] = max_pixels_mpixels

        return ocrmypdf_args

    def parse(self, document_path: Path, mime_type, file_name=None):
        # This forces tesseract to use one core per page.
        os.environ["OMP_THREAD_LIMIT"] = "1"
        VALID_TEXT_LENGTH = 50

        if mime_type == "application/pdf":
            text_original = self.extract_text(None, document_path)
            original_has_text = (
                text_original is not None and len(
                text_original) > VALID_TEXT_LENGTH
            )
        else:
            text_original = None
            original_has_text = False

        # If the original has text, and the user doesn't want an archive,
        # we're done here
        skip_archive_for_text = (
            self.settings.mode == ModeChoices.SKIP_NO_ARCHIVE
            or self.settings.skip_archive_file
            in {
                ArchiveFileChoices.WITH_TEXT,
                ArchiveFileChoices.ALWAYS,
            }
        )
        if skip_archive_for_text and original_has_text:
            self.log.debug("Document has text, skipping OCRmyPDF entirely.")
            self.text = text_original
            return

        # Either no text was in the original or there should be an archive
        # file created, so OCR the file and create an archive with any
        # text located via OCR

        import ocrmypdf
        from ocrmypdf import EncryptedPdfError
        from ocrmypdf import InputFileError
        from ocrmypdf import SubprocessOutputError

        archive_path = Path(os.path.join(self.tempdir, "archive.pdf"))
        sidecar_file = Path(os.path.join(self.tempdir, "sidecar.txt"))

        args = self.construct_ocrmypdf_parameters(
            document_path,
            mime_type,
            archive_path,
            sidecar_file,
        )
        data_ocr, data_ocr_fields, form_code, file_id, request_id = None, None, '', '', ''
        try:
            self.log.debug(f"Calling OCRmyPDF with args: {args}")
            # ocrmypdf.ocr(**args)
            data_ocr, data_ocr_fields, form_code, file_id, request_id = self.ocr_img_or_pdf(
                document_path, mime_type, **args)
            if self.settings.skip_archive_file != ArchiveFileChoices.ALWAYS:
                self.archive_path = archive_path

            self.text = self.extract_text(sidecar_file, archive_path)

            if not self.text:
                raise NoTextFoundException(
                    "No text was found in the original document")
        except EncryptedPdfError:
            self.log.warning(
                "This file is encrypted, OCR is impossible. Using "
                "any text present in the original file.",
            )
            if original_has_text:
                self.text = text_original
        except SubprocessOutputError as e:
            if "Ghostscript PDF/A rendering" in str(e):
                self.log.warning(
                    "Ghostscript PDF/A rendering failed, consider setting "
                    "PAPERLESS_OCR_USER_ARGS: '{\"continue_on_soft_render_error\": true}'",
                )

            raise ParseError(
                f"SubprocessOutputError: {e!s}. See logs for more information.",
            ) from e
        except (NoTextFoundException, InputFileError) as e:
            self.log.warning(
                f"Encountered an error while running OCR: {e!s}. "
                f"Attempting force OCR to get the text.",
            )

            archive_path_fallback = Path(
                os.path.join(self.tempdir, "archive-fallback.pdf"),
            )
            sidecar_file_fallback = Path(
                os.path.join(self.tempdir, "sidecar-fallback.txt"),
            )

            # Attempt to run OCR with safe settings.

            args = self.construct_ocrmypdf_parameters(
                document_path,
                mime_type,
                archive_path_fallback,
                sidecar_file_fallback,
                safe_fallback=True,
            )

            try:
                self.log.debug(f"Fallback: Calling OCRmyPDF with args: {args}")
                # ocrmypdf.ocr(**args)
                data_ocr, data_ocr_fields, form_code, file_id, request_id = self.ocr_img_or_pdf(
                    document_path, mime_type, **args)
                # Don't return the archived file here, since this file
                # is bigger and blurry due to --force-ocr.

                self.text = self.extract_text(
                    sidecar_file_fallback,
                    archive_path_fallback,
                )

            except Exception as e:
                # If this fails, we have a serious issue at hand.
                raise ParseError(f"{e.__class__.__name__}: {e!s}") from e

        except Exception as e:
            # Anything else is probably serious.
            raise ParseError(f"{e.__class__.__name__}: {e!s}") from e

        # As a last resort, if we still don't have any text for any reason,
        # try to extract the text from the original document.
        if not self.text:
            if original_has_text:
                self.text = text_original
            else:
                self.log.warning(
                    f"No text was found in {document_path}, the content will "
                    f"be empty.",
                )
                self.text = ""
        return data_ocr_fields, form_code, file_id, request_id

    def parse_field(self, document_path: Path, mime_type, file_name=None):
        # This forces tesseract to use one core per page.
        os.environ["OMP_THREAD_LIMIT"] = "1"
        VALID_TEXT_LENGTH = 50
        from ocrmypdf import InputFileError

        archive_path = Path(os.path.join(self.tempdir, "archive.pdf"))
        sidecar_file = Path(os.path.join(self.tempdir, "sidecar.txt"))

        args = self.construct_ocrmypdf_parameters(
            document_path,
            mime_type,
            archive_path,
            sidecar_file,
        )
        data_ocr, data_ocr_fields, form_code, file_id, request_id = None, None, '', '', ''
        try:
            self.log.debug(f"Calling OCRmyPDF with args: {args}")
            # ocrmypdf.ocr(**args)
            data_ocr, data_ocr_fields, form_code, file_id, request_id = self.ocr_img_or_pdf(
                document_path, mime_type, **args)
            if self.settings.skip_archive_file != ArchiveFileChoices.ALWAYS:
                self.archive_path = archive_path

        except (InputFileError) as e:
            self.log.warning(
                f"Encountered an error while running OCR: {e!s}. "
                f"Attempting force OCR to get the text.",
            )

            archive_path_fallback = Path(
                os.path.join(self.tempdir, "archive-fallback.pdf"),
            )

            # Attempt to run OCR with safe settings.

            args = self.construct_ocrmypdf_parameters(
                document_path,
                mime_type,
                archive_path_fallback,
                safe_fallback=True,
            )

            try:
                self.log.debug(f"Fallback: Calling OCRmyPDF with args: {args}")
                # ocrmypdf.ocr(**args)
                data_ocr, data_ocr_fields, form_code, file_id, request_id = self.ocr_img_or_pdf(
                    document_path, mime_type, **args)

            except Exception as e:
                # If this fails, we have a serious issue at hand.
                raise ParseError(f"{e.__class__.__name__}: {e!s}") from e

        except Exception as e:
            # Anything else is probably serious.
            raise ParseError(f"{e.__class__.__name__}: {e!s}") from e

        return data_ocr_fields, form_code


def post_process_text(text):
    if not text:
        return None

    collapsed_spaces = re.sub(r"([^\S\r\n]+)", " ", text)
    no_leading_whitespace = re.sub(r"([\n\r]+)([^\S\n\r]+)", "\\1",
                                   collapsed_spaces)
    no_trailing_whitespace = re.sub(r"([^\S\n\r]+)$", "",
                                    no_leading_whitespace)

    # TODO: this needs a rework
    # replace \0 prevents issues with saving to postgres.
    # text may contain \0 when this character is present in PDF files.
    return no_trailing_whitespace.strip().replace("\0", " ")
