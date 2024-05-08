type PluginType = Formatter | Log | CreateLogFile | LoadPlugins | Close | LoadJson | any;

interface Plugin {
    execute(...args: any[]): any;
}

interface Formatter extends Plugin {
    func: (...args: any[]) => any;
    params: [level: string, message: string, timestamp: string, context?: undefined];
    returnType: string;
}

interface Log extends Plugin{
    func: (...args: any[]) => any;
    params: [level: string, message: string, context?: undefined];
    returnType: void;
}

interface CreateLogFile extends Plugin{
    func: (...args: any[]) => any;
    params: [];
    returnType: void;
}

interface LoadPlugins extends Plugin {
    func: (...args: any[]) => any;
    params: [];
    returnType: void;
}

interface Close extends Plugin{
    func: (...args: any[]) => any;
    params: [];
    returnType: void;
}

interface LoadJson {
    func: (...args: any[]) => any;
    params: [path: string];
    returnType: void;
}
interface Settings{
    LogLevels: {
        [key: string]: number;
    };
    Formats: {
        [key: string]: string;
    };
}


export {
    PluginType,
    Plugin,
    Settings

};
