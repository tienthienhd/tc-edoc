import { Component, OnInit, Renderer2, ElementRef } from '@angular/core';
import { FoldersService } from 'src/app/services/rest/folders.service';
import { Document, Folders, Results } from 'src/app/data/folders';

@Component({
  selector: 'app-view-all-folder',
  templateUrl: './viewall-forder.component.html',
  styleUrls: ['./viewall-forder.component.scss']
})
export class ViewallForderComponent implements OnInit {
  folders: Folders[] = [];
  documents: Document[] = [];
  results: Results[] = [];
  selectedFolderId: number | null = null;

  constructor(private foldersService: FoldersService, private renderer: Renderer2, private elementRef: ElementRef) {}

  ngOnInit(): void {
    this.foldersService.getFoldersAndDocuments().subscribe({
      next: (data: any) => {
        this.folders = data.folders;
        this.documents = data.documents;
        this.initializeFolders();
        this.initializeDocuments();
        this.addEventListeners();
        this.setupEventListeners();
      },
      error: error => {
        console.error('Error fetching data:', error);
      }
    });

    this.foldersService.getResults().subscribe({
      next: (data: any) => {
        this.results = data.results.filter(result => result.parent_folder !== null);
        this.initializeFolders();
      },
      error: error => {
        console.error('Error fetching results:', error);
      }
    });
  }
  setupEventListeners(): void {
    document.addEventListener("DOMContentLoaded", () => {
      const folderLeft = document.getElementById('folderLeft');
      const folderright = document.getElementById('folderrightt');
      const folderContainer = document.querySelector('.folder-container');
      const zoom = document.getElementById("zoomImg");
      const contextMenu = document.getElementById("contextMenu");
      const toggleButton = document.getElementById("toggleButton");
      const amButton = document.getElementById("am");
      const subFolderContainer = document.querySelector('.sub-folder-container') as HTMLElement;

      let eventsEnabled = false;

      amButton.addEventListener("click", () => {
        subFolderContainer.style.display = "block";
        contextMenu.style.display = "none";

        const inputInSubFolder = subFolderContainer.querySelector('input[type="text"]') as HTMLElement;
        if (inputInSubFolder) {
          inputInSubFolder.focus();
        }

        const allInputs = document.querySelectorAll('input');
        allInputs.forEach((input) => {
          if (input !== inputInSubFolder) {
            input.blur();
          }
        });
      });

      document.getElementById('sss').addEventListener('click', () => {
        const contextMenu1 = document.querySelector('.sub-folder-container') as HTMLElement;
        if (contextMenu1) {
          contextMenu1.style.display = 'none';
        }
      });

      folderLeft.addEventListener('click', () => {
        hideContextMenu();
      });

      folderLeft.addEventListener('contextmenu', (event) => {
        event.preventDefault();
        showContextMenu(event.clientX, event.clientY);
      });

      document.addEventListener('mousedown', (event) => {
        const targetElement = event.target as HTMLElement;

        const clickedInsideContextMenu = contextMenu.contains(targetElement);
        const clickedInsideFolderContainer = folderContainer.contains(targetElement);
        const clickedInsideAddFolder = targetElement.classList.contains('addfolder') || targetElement.closest('.addfolder');
        const clickedInsideAm = targetElement.id === 'am' || targetElement.closest('#am');

        if (!clickedInsideContextMenu && !clickedInsideAddFolder && !clickedInsideAm) {
          hideContextMenu();
        }

        if (clickedInsideAm) {
          event.preventDefault();
        }
      });

      toggleButton.addEventListener("click", () => {
        toggleEvents();
      });

      function showContextMenu(x: number, y: number) {
        if (contextMenu) {
          contextMenu.style.display = "block";
          contextMenu.style.left = x + "px";
          contextMenu.style.top = y + "px";
        }
      }

      function hideContextMenu() {
        if (contextMenu) {
          contextMenu.style.display = "none";
        }
      }

      function toggleEvents() {
        eventsEnabled = !eventsEnabled;
        if (eventsEnabled) {
          if (zoom) {
            zoom.addEventListener("contextmenu", handleContextMenu);
          }
        } else {
          if (zoom) {
            zoom.removeEventListener("contextmenu", handleContextMenu);
          }
        }
      }

      function handleContextMenu(e: MouseEvent) {
        e.preventDefault();
        showContextMenu(e.clientX, e.clientY);
      }

      if (zoom) {
        zoom.onmouseup = () => {
          if (eventsEnabled) {
            hideContextMenu();
          }
        };

        zoom.onmousemove = (e: MouseEvent) => {
          // Additional handling if needed
        };
      }
    });
  }

  initializeFolders(): void {
    const foldersContainer = this.elementRef.nativeElement.querySelector('#folders-container');
    if (foldersContainer) {
      const allFolders = [...this.folders, ...this.results];
      foldersContainer.innerHTML = '';

      const folderMap = new Map<number, Folders[]>();
      allFolders.forEach(folder => {
        const parentId = folder.parent_folder ?? null;
        if (!folderMap.has(parentId)) {
          folderMap.set(parentId, []);
        }
        folderMap.get(parentId)?.push(folder);
      });

      const createFolders = (parentId: number | null, parentDiv: HTMLElement | null): void => {
        const children = folderMap.get(parentId) || [];
        children.forEach(folder => {
          const folderHTML = this.createFolderHTML(folder);
          if (parentDiv) {
            this.renderer.appendChild(parentDiv, folderHTML);
          } else {
            this.renderer.appendChild(foldersContainer, folderHTML);
          }
          createFolders(folder.id, folderHTML.querySelector('.children-container') as HTMLElement);
        });
      };

      createFolders(null, null);
    }
  }

  initializeDocuments(): void {
    const documentsContainer = this.elementRef.nativeElement.querySelector('#documents-container');
    if (documentsContainer) {
      documentsContainer.innerHTML = '';
      const addedDocumentFilenames = new Set<string>();

      this.documents.forEach(doc => {
        const folder = this.findFolderById(doc.folder_id);
        if (!addedDocumentFilenames.has(doc.filename)) {
          if (folder && folder.id > 0) {
            const folderDiv = this.findFolderDiv(folder.id);
            if (folderDiv) {
              const documentsContainerInFolder = folderDiv.querySelector('.documents-container') as HTMLElement;
              if (documentsContainerInFolder && !documentsContainerInFolder.querySelector(`.document[data-document-id="${doc.id}"]`)) {
                const documentHTML = this.createDocumentHTML(doc);
                this.renderer.appendChild(documentsContainerInFolder, documentHTML);
                addedDocumentFilenames.add(doc.filename);
              }
            }
          } else {
            if (!documentsContainer.querySelector(`.document[data-document-id="${doc.id}"]`)) {
              const documentHTML = this.createDocumentHTML(doc);
              this.renderer.appendChild(documentsContainer, documentHTML);
              addedDocumentFilenames.add(doc.filename);
            }
          }
        }
      });
    }
  }

  addEventListeners(): void {
    // Handling double click for elements with class .folder-cha
    const folderChaElements = this.elementRef.nativeElement.querySelectorAll('.folder-cha');
    folderChaElements.forEach(item => {
      this.renderer.listen(item, 'dblclick', (event: Event) => {
        const target = event.currentTarget as HTMLElement;
        const folderElement = target.closest('.folder') as HTMLElement;
        const folderId = Number(folderElement?.dataset.folderId);
        this.confirmDisplayFolderContents(folderId);
      });
    });
  
    // Remove all 'click' event listeners on 'tr' elements
    const folderRows = this.elementRef.nativeElement.querySelectorAll('tr[data-folder-id]');
    folderRows.forEach(row => {
      // Completely remove 'click' event listener
      row.removeEventListener('click', this.handleRowClick);
      
      // Use 'dblclick' instead of 'click'
      this.renderer.listen(row, 'dblclick', (event: Event) => {
        const target = event.currentTarget as HTMLTableRowElement;
        const folderId = Number(target.dataset.folderId);
        this.confirmDisplayFolderContents(folderId);
      });
    });
  
    // Resizing folderLeft section (unchanged from original)
    const folderLeft = this.elementRef.nativeElement.querySelector('#folderLeft');
    if (folderLeft) {
      const resizeHandle = folderLeft.querySelector('.resize-handle') as HTMLElement;
      if (resizeHandle) {
        let startX: number;
        let startWidth: number;
  
        const resizeWidth = (event: MouseEvent) => {
          const newWidth = startWidth + (event.clientX - startX);
          folderLeft.style.width = `${newWidth}px`; // Corrected template literal usage
        
          const folderRight = this.elementRef.nativeElement.querySelector('.folder-right') as HTMLElement;
          if (folderRight) {
            folderRight.style.width = `calc(100% - ${newWidth}px)`; // Corrected template literal usage
          }
        };
        
  
        const stopResize = () => {
          document.removeEventListener('mousemove', resizeWidth);
          document.removeEventListener('mouseup', stopResize);
        };
  
        this.renderer.listen(resizeHandle, 'mousedown', (event: MouseEvent) => {
          startX = event.clientX;
          startWidth = parseInt(window.getComputedStyle(folderLeft).width, 10);
          document.addEventListener('mousemove', resizeWidth);
          document.addEventListener('mouseup', stopResize);
        });
      }
    }
  }
  
  // Example function for handling 'click' on rows (if necessary)
  handleRowClick(event: Event) {
    const target = event.currentTarget as HTMLTableRowElement;
    const folderId = Number(target.dataset.folderId);
    // Handle click action here if needed
  }
  
  

  confirmDisplayFolderContents(folderId: number): void {
    this.displayFolderContents(folderId);
  }

  displayFolderContents(folderId: number, parentRow: HTMLTableRowElement | null = null): void {
    const tableBody = this.elementRef.nativeElement.querySelector('.folder-contents tbody');
    if (tableBody) {
      const rowsToRemove = parentRow
      ? tableBody.querySelectorAll(`.child-of-folder-${folderId}`)
      : tableBody.querySelectorAll('tr');
      rowsToRemove.forEach(row => row.remove());

      const childFolders = this.folders.filter(folder => folder.parent_folder === folderId);
      const childResults = this.results.filter(result => result.parent_folder === folderId);
      const allChildFolders = [...childFolders, ...childResults];

      allChildFolders.forEach(folder => {
        const row = this.createFolderRowHTML(folder, folderId);
        if (parentRow) {
          parentRow.insertAdjacentElement('afterend', row);
        } else {
          tableBody.appendChild(row);
        }
      });

      const childDocuments = this.documents.filter(doc => doc.folder_id === folderId);
      childDocuments.forEach(doc => {
        const row = this.createDocumentRowHTML(doc, folderId);
        if (parentRow) {
          parentRow.insertAdjacentElement('afterend', row);
        } else {
          tableBody.appendChild(row);
        }
      });

      this.addRowEventListeners();
    }
  }

  createFolderRowHTML(folder: Folders, parentId: number): HTMLElement {
    const row = document.createElement('tr');
    row.classList.add(`child-of-folder-${parentId}`);
    row.dataset.folderId = folder.id.toString();

    const nameCell = document.createElement('td');
    const folderIcon = document.createElement('i');
    folderIcon.classList.add('fa-solid', 'fa-folder');
    const folderName = document.createElement('p');
    folderName.textContent = folder.name;
    nameCell.appendChild(folderIcon);
    nameCell.appendChild(folderName);

    const dateCell = document.createElement('td');
    dateCell.textContent = '11/10/2002'; // Placeholder date

    const typeCell = document.createElement('td');
    typeCell.textContent = 'File Folder';

    const sizeCell = document.createElement('td');
    sizeCell.textContent = '2 KB'; // Placeholder size

    row.appendChild(nameCell);
    row.appendChild(dateCell);
    row.appendChild(typeCell);
    row.appendChild(sizeCell);

    return row;
  }

  createDocumentRowHTML(doc: Document, parentId: number): HTMLElement {
    const row = document.createElement('tr');
    row.classList.add(`child-of-folder-${parentId}`);
    row.dataset.documentId = doc.id.toString();

    const nameCell = document.createElement('td');
    const fileIcon = document.createElement('i');
    fileIcon.classList.add('fa-solid', 'fa-file');
    const fileName = document.createElement('p');
    fileName.textContent = doc.filename;
    nameCell.appendChild(fileIcon);
    nameCell.appendChild(fileName);

    const dateCell = document.createElement('td');
    dateCell.textContent = '11/10/2002'; // Placeholder date

    const typeCell = document.createElement('td');
    typeCell.textContent = 'txt'; // Placeholder type

    const sizeCell = document.createElement('td');
    sizeCell.textContent = '2 KB'; // Placeholder size

    row.appendChild(nameCell);
    row.appendChild(dateCell);
    row.appendChild(typeCell);
    row.appendChild(sizeCell);

    return row;
  }

  createFolderHTML(folder: Folders): HTMLElement {
    const folderDiv = document.createElement('div');
    folderDiv.classList.add('folder');
    folderDiv.dataset.folderId = folder.id.toString();

    const folderIcon = document.createElement('i');
    folderIcon.classList.add('fa', 'fa-solid', 'fa-chevron-right');

    const folderIconFolder = document.createElement('i');
    folderIconFolder.classList.add('fa', 'fa-solid', 'fa-folder');

    const folderName = document.createElement('p');
    folderName.textContent = folder.name;

    const folderHeader = document.createElement('div');
    folderHeader.classList.add('folder-cha');
    folderHeader.appendChild(folderIcon);
    folderHeader.appendChild(folderIconFolder);
    folderHeader.appendChild(folderName);

    folderDiv.appendChild(folderHeader);

    const childrenContainer = document.createElement('div');
    childrenContainer.classList.add('children-container');
    childrenContainer.style.display = 'none';
    folderDiv.appendChild(childrenContainer);

    // Function to log folder chain recursively
    const logFolderChainRecursive = (currentFolder: Folders, chain: string[] = []) => {
        chain.unshift(currentFolder.id.toString()); // Prepend current folder id to the chain

        if (currentFolder.parent_folder) {
            const parentFolder = this.findFolderById(currentFolder.parent_folder);
            if (parentFolder) {
                logFolderChainRecursive(parentFolder, chain); // Recursive call to log parent folder
            }
        } else {
            console.log(`Clicked folder ${chain.join(' > ')}`); // Log the chain when reached the root folder
        }
    };

    this.renderer.listen(folderHeader, 'click', () => {
        logFolderChainRecursive(folder); // Start logging from the clicked folder
        this.displayFolderContents(folder.id);
    });

    this.renderer.listen(folderIcon, 'click', (event: Event) => {
        event.stopPropagation();
        if (childrenContainer.style.display === 'none') {
            childrenContainer.style.display = 'block';
            folderIcon.style.transform = 'rotate(90deg)';
            folderIconFolder.classList.replace('fa-folder', 'fa-folder-open');
        } else {
            childrenContainer.style.display = 'none';
            folderIcon.style.transform = '';
            folderIconFolder.classList.replace('fa-folder-open', 'fa-folder');
        }
    });

    // Recursively create HTML for child folders
    const childFolders = this.folders.filter(f => f.parent_folder === folder.id);
    childFolders.forEach(childFolder => {
        const childFolderHTML = this.createFolderHTML(childFolder);
        childrenContainer.appendChild(childFolderHTML);
    });

    return folderDiv;
}



  createDocumentHTML(doc: Document): HTMLElement {
    const documentDiv = document.createElement('div');
    documentDiv.classList.add('document');
    documentDiv.dataset.documentId = doc.id.toString();

    const documentName = document.createElement('p');
    documentName.textContent = doc.filename;

    const documentContainer = document.createElement('div');
    documentContainer.classList.add('document-container');
    documentContainer.appendChild(documentName);

    documentDiv.appendChild(documentContainer);
    return documentDiv;
  }

  findFolderById(folderId: number): Folders | undefined {
    return this.folders.find(folder => folder.id === folderId);
  }

  findFolderDiv(folderId: number): HTMLElement | null {
    const foldersContainer = document.getElementById('folders-container');
    return foldersContainer?.querySelector(`.folder[data-folder-id="${folderId}"]`) as HTMLElement | null;
  }

  addRowEventListeners(): void {
    const folderRows = this.elementRef.nativeElement.querySelectorAll('tr[data-folder-id]');
    folderRows.forEach(row => {
      this.renderer.listen(row, 'dblclick', (event: Event) => {
        const target = event.currentTarget as HTMLTableRowElement;
        const folderId = Number(target.dataset.folderId);
        this.confirmDisplayFolderContents(folderId);
      });
    });
  }
}