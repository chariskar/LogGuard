import * as fs from 'fs'
import type { Close } from '../../Types';

class FileNotOpen extends Error {}

export default class ClosePlugin implements Close {
    params: [logFile: fs.WriteStream, openloggers: {}, logFileName: string];
    returnType: void;

    func(logFile: fs.WriteStream | null, openloggers: Record<string, fs.WriteStream>, logFileName: string): void {
        if (!logFile) {
            throw new FileNotOpen('LogFile is not open');
        }
        logFile.close();
        delete openloggers[logFileName];
    }

    execute(logFile: fs.WriteStream | null, openloggers: Record<string, fs.WriteStream>, logFileName: string): void {
        this.func(logFile, openloggers, logFileName);
    }
}
