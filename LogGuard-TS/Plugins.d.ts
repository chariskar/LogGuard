type PluginType = Formatter | Log | CreateLogFile | LoadPlugins | Close | LoadJson | any;

interface Formatter {
    func: (...args: any[]) => any;
    params: [level: string, message: string, timestamp: string, context?: undefined];
    returnType: string;
}

interface Log {
    func: (...args: any[]) => any;
    params: [level: string, message: string, context?: undefined];
    returnType: void;
}

interface CreateLogFile {
    func: (...args: any[]) => any;
    params: [];
    returnType: void;
}

interface LoadPlugins {
    func: (...args: any[]) => any;
    params: [];
    returnType: void;
}

interface Close {
    func: (...args: any[]) => any;
    params: [];
    returnType: void;
}

interface LoadJson {
    func: (...args: any[]) => any;
    params: [path: string];
    returnType: void;
}

export {
    PluginType,
    Formatter,
    Log,
    CreateLogFile,
    LoadPlugins,
    Close,
    LoadJson
};
