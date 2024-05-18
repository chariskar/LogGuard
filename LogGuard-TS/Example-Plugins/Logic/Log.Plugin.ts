import type { Log } from "../../Types";
import * as fs from 'fs'

export default class log implements Log {
    func(message: string,logFile: fs.WriteStream){
        logFile.write(message)
        // those are just adjusted examples from the main code
    };
    params: [timestamp: string, message: string,logFile: fs.WriteStream];
    returnType: void;
    execute(message: string,logFile: fs.WriteStream) {
        this.func(message,logFile)
    }

}
// E.O.F.