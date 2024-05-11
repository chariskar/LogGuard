import * as fs from 'fs'
import type { CreateLogFile } from '../Types'
class PathNonExistant extends Error {} 


export class CreateLogFilePlugin implements CreateLogFile {
    params: [endsWith: boolean, logFileName: string, combineLoggers: boolean, openLoggers: {}, logFilePath: string];
    returnType: fs.WriteStream;

    func(
        endsWith: boolean,
        logFileName: string,
        combineLoggers: boolean,
        openLoggers: {},
        logFilePath: string
    ): fs.WriteStream{
        if (logFilePath && !endsWith) {
            fs.mkdirSync(logFilePath, { recursive: true }) // Create the log directory if it doesn't exist
        } else if (!logFilePath) {
            throw new PathNonExistant('Output directory not specified') // Raise an error if output directory is not specified
        }
        try{
            if (!fs.existsSync(logFileName)) {
                fs.writeFileSync(logFileName,'')
                if (combineLoggers){
                    const format = `[INFO] [${new Date().toISOString().replace(/:/g, '-').replace(/T/, '_').replace(/\..+/, '')}] Starting`
                    fs.writeFileSync(logFileName,format)
                }
            }
            if (combineLoggers){
                if (!(logFileName in openLoggers)){
                    const logFile = fs.createWriteStream(logFileName,{  flags: 'a'})
                    openLoggers[logFileName] = logFile
                    return logFile
                } else {
                    const logFile = openLoggers[logFileName]
                    return logFile                    
                }

            } else {
                const logFile = fs.createWriteStream(logFileName,{ flags: 'a' })
                openLoggers[logFileName] = logFile
                if (!combineLoggers) {
                    logFile.write(`[INFO] [${new Date().toISOString().replace(/:/g, '-').replace(/T/, '_').replace(/\..+/, '')}] Starting`)
                }
                return logFile
            }

        } catch(e){
            throw new e
        }
    }
    execute(
        endsWith: boolean,
        logFileName: string,
        combineLoggers: boolean,
        openLoggers: {},
        logFilePath: string
    ) {
       this.func(
        endsWith,
        logFileName,
        combineLoggers,
        openLoggers,
        logFilePath
       ) 
    }
    
}
// E.O.F.