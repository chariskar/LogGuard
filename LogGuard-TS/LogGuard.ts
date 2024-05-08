import * as fs from 'fs'
import * as path from 'path'
import type {PluginType} from './Plugins.d.ts'

class FileNotOpen extends Error {} // FileNotOpen Error
class PathNonExistant extends Error {} // PathNonExistant Error
class PluginLoadingError extends Error{}

interface Settings{
    LogLevels: {
        [key: string]: number;
    };
    Formats: {
        [key: string]: string;
    };
}


class Logger {
	/**
     * @param {string} [output_dir='logs'] - The directory where log files will be stored.
     * @param {string} [log_file_type='log'] - The type of log file (e.g., 'log', 'txt').
     * @param {string} [settings_path='./log_settings.json'] - The path to the log settings file.
     * @param {string} [LogLevel='INFO'] - The log level (e.g., 'INFO', 'DEBUG') to be ignored.
     * @throws {Error} If the log file type isnt supported.
     * @description  The logger class
     */

	private loglevel: string
	private open_loggers: Record<string, fs.WriteStream> = {}
	private settings: Settings
	private configured_level_value: number | null
	private file_path: string | null
	private log_file: fs.WriteStream | null
	private log_file_name: string | null
	private timestamp: string | null
	private supported_formats: string[] = ['log','txt']
	private log_file_type: string
	private settings_path: string
	private pluginsPath: string
	private plugins: PluginType[]
	public UsedPlugins: PluginType | PluginType[]

	constructor(
		output_dir: string = 'logs',
		log_file_type: string = 'log',
		settings_path: string = 'log_settings.json',
		LogLevel: string = 'INFO',
		pluginsPath: string = './Plugins',
		UsedPlugins: PluginType[] | PluginType = []
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

	/**
     * @param {string} [level] - The log level (e.g., 'INFO', 'DEBUG').
     * @param {string} [message] - The message to log.
     * @param {any} [context] - Additional context for the log message.
     * @throws {FileNotOpen} If the settings or the Log file isnt open.
     * @description Logs the message to the log file
     */
	log(level: string, message: string, context?: undefined): void {
        
		const timestamp: string = new Date().toISOString().replace(/:/g, '-').replace(/T/, '_').replace(/\..+/, '')
		level = level.toUpperCase() // make the level upper case if it isn't

		if (this.log_file) { // if the log file exists
			if (this.settings) { // if the self.settings variable is not null
				const log_level_value: number = this.settings['LogLevels'][level]

				if (log_level_value && this.configured_level_value) {
					// check that the configured log level is lower than the given log level
					if (log_level_value >= this.configured_level_value) {
						if (timestamp) {
							// write the formatted message to the log file
							if (context) {
								const formatted_message: string = this.Formatter(level, message, timestamp, context)
								if (formatted_message !== null) {
									this.log_file.write(formatted_message)
                                    
								}
							} else {
								const formatted_message: string = this.Formatter(level, message, timestamp)
								if (formatted_message !== null) {
									this.log_file.write(formatted_message)
                                    
								}
							}
						}
					}
				} else {
					// Log level is lower than configured level, do nothing
				}
			} else {
				throw new FileNotOpen('Settings file is not open')
			}
		} else {
			throw new FileNotOpen('Log file is not open')
		}
	}

	/**
    * @param {string} [level] -The severity level.
    * @param {string} [message] - The message to be logged.
    * @param {string} [timestamp] - The time at which the message was logged.
    * @param {undefined} [context] - The context to be logged.
    * @throws {FileNotOpen} If the settings file is not open.
    * @returns {string} The formated message
    * @description Format the message
    */
	Formatter(level: string, message: string, timestamp: string, context?: undefined): string {
		let formattedMessage: string = '';
	
		if (this.settings) {
			if (this.hasPlugin(this.UsedPlugins, 'Formatter')) {
				const formatterPlugin = this.plugins.find(plugin => 'Formatter' in plugin);
				if (formatterPlugin) {
					formattedMessage = formatterPlugin.Formatter(level, message, timestamp, context);
				}
			} else {
				if (context) {
					// get the formats and then replace placeholders with values
					const format_template: string = this.settings['Formats']['Context'];
					formattedMessage = format_template
						.replace('{level}', level)
						.replace('{message}', message)
						.replace('{timestamp}', timestamp)
						.replace('{context}', context);
				} else {
					const format_template: string = this.settings['Formats']['NonContext'];
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
	

	/**
     * @throws {PathNonExistant} If the the path is null.
     * @description Create the log file in the specified directory.
     */
	create_log_file(): void {
		// Determine if the output directory ends with ".log"
		const outputDirEndsWithLogExtension = this.file_path && this.file_path.endsWith('.log')
    
		// Determine the log file name based on the output directory and file extension
		const logFileName = outputDirEndsWithLogExtension ? this.file_path : this.get_log_name()
    
		// Determine if loggers with the same or default log path should combine their logs
		const combineLoggers = this.file_path === 'logs' || this.file_path === '.'
    
		// Ensure the output directory exists
		if (this.file_path && !outputDirEndsWithLogExtension) {
			fs.mkdirSync(this.file_path, { recursive: true }) // Create the log directory if it doesn't exist
		} else if (!this.file_path) {
			throw new PathNonExistant('Output directory not specified') // Raise an error if output directory is not specified
		}
    
		try {
			if (logFileName){
				if (!fs.existsSync(logFileName)) {
				// Create the log file if it doesn't exist
					fs.writeFileSync(logFileName, '')
					// Add a starting message if loggers are combined
					if (combineLoggers) {
						this.log('info', 'Starting')
					}
				}
    
				// Open or create the log file based on whether loggers should combine their logs
				if (combineLoggers) {
					if (!(logFileName in this.open_loggers)) {
						this.log_file = fs.createWriteStream(logFileName, { flags: 'a' })
						this.open_loggers[logFileName] = this.log_file
					} else {
						this.log_file = this.open_loggers[logFileName]
					}
				} else {
					this.log_file = fs.createWriteStream(logFileName, { flags: 'a' })
					this.open_loggers[logFileName] = this.log_file
					if (!combineLoggers) {
						this.log('info', 'Starting')
					}
				}}
            
			// Check if the log file exists
			
		} catch (error) {
			throw new Error(`Error while creating log file: ${error}`)
		}
	}
    
    /**
	 * @returns {Plugin[] | Plugin} - Returns the Plugins
	 */
    loadPlugins(): Plugin[] {
        const plugins: Plugin[] = [];
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
	/**
     * @throws {PathNonExistant} If file path is null.
     * @description Get the full path of the log file.
     * @returns {string} The full log file path.
     */
	get_log_name(): string {
		if (this.file_path) {
			return path.resolve(this.file_path, `${this.timestamp}.${this.log_file_type}`) // return the filepath and the name of the file
		} else {
			throw new PathNonExistant('File path not found') // raise an error if file path is  null
		}
	}
	/**
    * @param {string} [path] - The path to be opened
    * @throws {PathNonExistant} If the file path does not exist
    * @description Opens json files
    */
	load_json(path: string) {

		if (fs.existsSync(path)) {
			const data: string = fs.readFileSync(path, 'utf8')
			return JSON.parse(data)
		} else {
			throw new PathNonExistant('File path does not exist')
		}
	}

	/**
	 * @param {PluginType | PluginType[]} plugins - The plugin or array of plugins to check.
	 * @param {string} methodName - The name of the method to check for.
	 * @returns {plugins is Formatter} True if the plugin or plugins have the specified method.
	 * @description Type guard to check if the plugin or plugins have the specified method.
	 */
	hasPlugin(plugins: PluginType | PluginType[], methodName: string): plugins is PluginType {
		if (Array.isArray(plugins)) {
			return plugins.some(plugin => methodName in plugin);
		} else {
			return methodName in plugins;
		}
	}

	/**
     *@throws {FileNotOpen} If the log file is not open 
     *@description Closes the current log file
     */
	close(): void {
		if (this.log_file) {
			try {
				this.log('info', 'Closing file')
			} finally {
				this.log_file.close()
				delete this.open_loggers[String(this.log_file_name)]
				this.log_file = null
			}
		} else {
			throw new FileNotOpen('Log file is not open')
		}
	}
}

export { Logger }
