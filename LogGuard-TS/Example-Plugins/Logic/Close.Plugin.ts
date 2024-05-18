import * as fs from 'fs'
import type { Close } from '../../Types';
class FileNotOpen extends Error{} 
export default class close implements Close{

    func(
        logFile: fs.WriteStream | null,
        openloggers: {},
        logFileName: string
    ): void{
        if(!logFile){
            throw new FileNotOpen('LogFile is not open')
        }
        logFile.close()
        delete openloggers[logFileName]
        logFile = null
    }
    params: [logFile: fs.WriteStream, openloggers: {},logFileName: string];
    returnType: void;
    execute(
        logFile: fs.WriteStream,
        openloggers: {},
        logFileName: string
    ) {
        this.func(
            logFile,
            openloggers,
            logFileName
        )
    }
}
// E.O.F.