// src/types/winston-daily-rotate-file.d.ts
import 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';

declare module 'winston' {
    namespace transports {
        export const DailyRotateFile: typeof DailyRotateFile;
    }
}
