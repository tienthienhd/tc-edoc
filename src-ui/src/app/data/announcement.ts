import { ObjectWithId } from './object-with-id'
export enum ReadStatus {
   Read = 1,
}
export interface Announcement extends ObjectWithId{
    label: string;
    text: string;
    enabled: boolean;
    start_datetime: Date | null;
    end_datetime: Date | null;
    object_pk: string;
    status: string;
    access_type: string;
    created: Date;
    modified: Date;
    is_read: boolean;
    received_by: number;
    received_by_group: number;
    ctype: number;
}
