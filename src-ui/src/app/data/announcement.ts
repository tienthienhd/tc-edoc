import { ObjectWithId } from './object-with-id'

export interface Announcement extends ObjectWithId{
    name: string;
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
    owner: number;
    received_by_group: number;
    // ctype: number;
    ctype: string; // Đảm bảo ctype là kiểu string
}
