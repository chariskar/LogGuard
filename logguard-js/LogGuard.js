import fs from 'fs';
import path from 'path';

class FileNotOpen extends Error {} 
class PathNonExistant extends Error {} 
class PluginLoadingError extends Error {}

class Logger {
    constructor(
        output_dir = 'logs',
        log_file_type = 'log',
        settings_path = 'log_settings.json',
        LogLevel = 'INFO',
        pluginsPath = './Plugins',
        UsedPlugins = []
    ) {
        this.loglevel = LogLevel.toUpperCase();
        this.timestamp = new Date().toISOString().replace(/:/g, '-').replace(/T/, '_').replace(/\..+/, '');
        this.supported_formats = ['log', 'txt'];
        this.configured_level_value = null;
        this.log_file = null;
        this.log_file_name = null;

        if (!this.supported_formats.includes(log_file_type)) {
            throw new Error('Log file type isn\'t supported');
        }
        this.log_file_type = log_file_type;
        this.file_path = output_dir === '.' ? path.resolve() : path.resolve(output_dir);
        this.settings_path = settings_path;
        this.settings = this.load_json(this.settings_path);
        if (this.settings) {
            this.configured_level_value = this.settings['LogLevels'][this.loglevel];
        }
        this.pluginsPath = pluginsPath;
        this.UsedPlugins = UsedPlugins;
        this.plugins = this.loadPlugins();
        this.create_log_file();
    }

    log(level, message, context) {
        if (this.hasPlugin(this.UsedPlugins, 'log')){
            const plugin = this.plugins.find(plugin => 'log' in plugin);
            plugin.log(level, message, context);
        } else{
            const timestamp = new Date().toISOString().replace(/:/g, '-').replace(/T/, '_').replace(/\..+/, '');
            level = level.toUpperCase();

            if (this.log_file) {
                if (this.settings) {
                    const log_level_value = this.settings['LogLevels'][level];

                    if (log_level_value && this.configured_level_value) {
                        if (log_level_value >= this.configured_level_value) {
                            if (timestamp) {
                                if (context) {
                                    const formatted_message = this.Formatter(level, message, timestamp, context);
                                    if (formatted_message !== null) {
                                        this.log_file.write(formatted_message);
                                    }
                                } else {
                                    const formatted_message = this.Formatter(level, message, timestamp);
                                    if (formatted_message !== null) {
                                        this.log_file.write(formatted_message);
                                    }
                                }
                            }
                        }
                    }
                } else {
                    throw new FileNotOpen('Settings file is not open');
                }
            } else {
                throw new FileNotOpen('Log file is not open');
            }
        }        
    }

    Formatter(level, message, timestamp, context) {
        let formattedMessage = '';
        
        if (this.settings) {
            if (this.hasPlugin(this.UsedPlugins, 'Formatter')) {
                const formatterPlugin = this.plugins.find(plugin => 'Formatter' in plugin);
                if (formatterPlugin) {
                    formattedMessage = formatterPlugin.Formatter(level, message, timestamp, context);
                }
            } else {
                if (context) {
                    const format_template = this.settings['Formats']['Context'];
                    formattedMessage = format_template
                        .replace('{level}', level)
                        .replace('{message}', message)
                        .replace('{timestamp}', timestamp)
                        .replace('{context}', context);
                } else {
                    const format_template = this.settings['Formats']['NonContext'];
                    formattedMessage = format_template
                        .replace('{level}', level)
                        .replace('{message}', message)
                        .replace('{timestamp}', timestamp);
                }
            }

            if (formattedMessage !== undefined) {
                return formattedMessage + '\n';
            }
        } else {
            throw new FileNotOpen('Settings file is not open');
        }
        throw new Error('Formatter function reached an unexpected state.');
    }

    create_log_file() {
        if (this.hasPlugin(this.UsedPlugins, 'create_log_file')){
            const plugin =  this.plugins.find(plugin => 'create_log_file' in plugin);
            plugin.create_log_file();
        } else{
            const outputDirEndsWithLogExtension = this.file_path && this.file_path.endsWith('.log');
            const logFileName = outputDirEndsWithLogExtension ? this.file_path : this.get_log_name();
            const combineLoggers = this.file_path === 'logs' || this.file_path === '.';
            
            if (this.file_path && !outputDirEndsWithLogExtension) {
                fs.mkdirSync(this.file_path, { recursive: true });
            } else if (!this.file_path) {
                throw new PathNonExistant('Output directory not specified');
            }
            
            try {
                if (logFileName){
                    if (!fs.existsSync(logFileName)) {
                        fs.writeFileSync(logFileName, '');
                        if (combineLoggers) {
                            this.log('info', 'Starting');
                        }
                    }
                    
                    if (combineLoggers) {
                        if (!(logFileName in this.open_loggers)) {
                            this.log_file = fs.createWriteStream(logFileName, { flags: 'a' });
                            this.open_loggers[logFileName] = this.log_file;
                        } else {
                            this.log_file = this.open_loggers[logFileName];
                        }
                    } else {
                        this.log_file = fs.createWriteStream(logFileName, { flags: 'a' });
                        this.open_loggers[logFileName] = this.log_file;
                        if (!combineLoggers) {
                            this.log('info', 'Starting');
                        }
                    }
                }
            } catch (error) {
                throw new Error(`Error while creating log file: ${error}`);
            }
        }
    }
    
    loadPlugins() {
        const plugins = [];

        const files = fs.readdirSync(this.pluginsPath);

        for (const file of files) {

            if (file.endsWith('.ts')) {

                const pluginPath = path.join(this.pluginsPath, file);
                const pluginModule = require(pluginPath);
                if (pluginModule && pluginModule.default && typeof pluginModule.default === 'function' && pluginModule.default.prototype.execute) {

                    const pluginInstance = new pluginModule.default();

                    plugins.push(pluginInstance);

                    this.UsedPlugins = [this.UsedPlugins, pluginInstance];
                } else {
                    throw new PluginLoadingError(`Unable to load plugin ${pluginPath}`);
                }
            }
        }
        return plugins;
    }

    get_log_name() {
        if (this.hasPlugin(this.UsedPlugins, 'get_log_name')){
            const plugin = this.plugins.find(plugin => 'get_log_name' in plugin);
            return plugin.get_log_name();
        } else {
            if (this.file_path) {
                return path.resolve(this.file_path, `${this.timestamp}.${this.log_file_type}`);
            } else {
                throw new PathNonExistant('File path not found');
            }
        }
    }

    load_json(path) {
        if (this.hasPlugin(this.UsedPlugins, 'load_json')){
            const plugin = this.plugins.find(plugin => 'load_json' in plugin);
            return plugin.load_json();
        }

        if (fs.existsSync(path)) {
            const data = fs.readFileSync(path, 'utf8');
            return JSON.parse(data);
        } else {
            throw new PathNonExistant('File path does not exist');
        }
    }

    hasPlugin(plugins, methodName) {
        if (Array.isArray(plugins)) {
            return plugins.some(plugin => methodName in plugin);
        } else {
            return methodName in plugins;
        }
    }

    close() {
        if (this.log_file) {
            if (this.hasPlugin(this.UsedPlugins, 'close')){
                const plugin = this.plugins.find(plugin => 'close' in plugin);
                plugin.close();
            } else{
                try {
                    this.log('info', 'Closing file');
                } finally {
                    this.log_file.close();
                    delete this.open_loggers[String(this.log_file_name)];
                    this.log_file = null;
                }
            }
            
        } else {
            throw new FileNotOpen('Log file is not open');
        }
    }
}

export { Logger };
