declare type PluginType = Formatter | Log | CreateLogFile  | Close | LogFileName | any
import {WriteStream} from 'fs'

declare interface Plugin {
    execute(...args: any[]): any
}

declare interface Formatter extends Plugin {
    func: (...args: any[]) => any
    params: [
        level: string,
        message: string,
        timestamp: string,
        format: Settings['Formats'],
        context?: undefined,
    ];
    returnType: string;
}

declare interface Log extends Plugin{
    func: (...args: any[]) => any;
    params: [
        message: string,
        LogFile: WriteStream,
    ];
    returnType: void;
}

declare interface LogFileName extends Plugin{
    func: (...args: any[]) => any;
    params: [
        path: string,
        type: string];
    returnType: string;
}

declare interface CreateLogFile extends Plugin{
    func: (...args: any[]) => any;
    params: [
            endsWith: boolean,
            logFileName: string,
            combineLoggers: boolean,
            openLoggers: {},
            logFilePath: string
        ]
    returnType: WriteStream;
}


declare interface Close extends Plugin{
    func: (...args: any[]) => any;
    params: [
        logFile: WriteStream,
        openloggers: {},
        logFileName: string
    ]
    returnType: void

}

declare interface Settings{
    LogLevels: {
        [key: string]: number;
    };
    Formats: {
        [key: string]: string;
    };
    Plugins: {
        enabled: boolean;
        UsedPlugins: string[];
        PluginPath:Record<string,string>,
        startup: {
            enabled: boolean,
            UsedPlugins: string[],  
            Path: Record<string,string>
        }
    }
}

declare interface LoggerInstance {
    loglevel: string;
    open_loggers: Record<string, fs.WriteStream>;
    settings: Settings;
    configured_level_value: number | null;
    file_path: string | null;
    log_file: fs.WriteStream | null;
    log_file_name: string | null;
    timestamp: string | null;
    supported_formats: string[];
    log_file_type: string;
    settings_path: string;
    pluginsPath: string | null | Record<string, string>;
    plugins: PluginType[] | null;
    UsedPlugins: string[];
    log(level: string, message: string, context?: any): void;
    Formatter(level: string, message: string, timestamp: string, context?: any): string;
    create_log_file(): void;
    get_log_name(): string;
    load_settings(path: string): Settings;
    hasPlugins(methodName: string): boolean | null;
    loadPlugins(): PluginType[];
    close(): void;
}

declare interface StartupPlugin extends Plugin{
    func: (...args: any[]) => any;
    params: [instance: LoggerInstance]
    returnType: void
}

export {
    PluginType,
    Plugin,
    Settings,
    Log,
    CreateLogFile,
    Close,
    Formatter,
    LogFileName,
    LoggerInstance,
    StartupPlugin
}
// E.O.F.