// imports
import * as path from 'path'
import type { PluginType, Settings, StartupPlugin} from './Types'
import * as fs from 'fs'

// errors
class FileNotOpen extends Error {} 

class PathNonExistant extends Error {} 

class PluginLoadingError extends Error {}

/**
 * @param {string} [output_dir='logs'] - The directory where log files will be stored.
 * @param {string} [log_file_type='log'] - The type of log file (e.g., 'log', 'txt').
 * @param {string} [settings_path='./log_settings.json'] - The path to the log settings file.
 * @param {string} [LogLevel='INFO'] - The log level (e.g., 'INFO', 'DEBUG') to be ignored.
 * @param {string | null} [pluginsPath=null] - The path were plugins are located
 * @param {PluginType[] | PluginType | null} [UsedPlugins=null] - A string list containing names of the plugins that are used
 * @throws {Error} If the log file type isnt supported.
 * @description  The logger class
 */
export class Logger {
	
	// variables
	private loglevel: string
	private open_loggers: Record<string, fs.WriteStream> = {}
	private settings: Settings
	private configured_level_value: number | null
	private file_path: string | null 
	private log_file: fs.WriteStream | null
	private log_file_name: string | null
	private timestamp: string | null
	private supported_formats: string[] = ['log', 'txt']
	private log_file_type: string
	private settings_path: string
	private pluginsPath: string | null | Record<string,string>
	private plugins: PluginType[] | null
	private UsedPlugins: string[]
	private StartupPluginsPath: Record<string,string>
	private UsedStartupPlugins: string[]

	constructor(
		output_dir: string = 'logs',
		log_file_type: string = 'log',
		settings_path: string = 'log_settings.json',
		LogLevel: string = 'INFO'
	) {
		try {
			this.loglevel = LogLevel.toUpperCase()
			this.timestamp = new Date().toISOString().replace(/:/g, '-').replace(/T/, '_').replace(/\..+/, '')
			this.configured_level_value = null
			this.log_file = null
			this.log_file_name = null


			if (!this.supported_formats.includes(log_file_type)) {

				throw new Error('Log file type isn\'t supported')
			}
			this.log_file_type = log_file_type

			this.file_path = output_dir === '.' ? path.resolve() : path.resolve(output_dir)

			this.settings_path = settings_path

			this.settings = this.load_settings(this.settings_path)
			
			if (this.settings) {
				this.configured_level_value = this.settings.LogLevels[this.loglevel]
			}

			if (this.settings.Plugins.enabled) {

				this.UsedPlugins = this.settings.Plugins.UsedPlugins

				this.pluginsPath = this.settings.Plugins.PluginPath

				if (this.settings.Plugins.startup.enabled){

					this.StartupPluginsPath = this.settings.Plugins.startup.Path

					this.UsedStartupPlugins = this.settings.Plugins.startup.UsedPlugins

					this.loadStartupPlugins()

				}
				this.plugins = this.loadPlugins()
			}

			this.create_log_file()
		} catch (e) {
			throw e
		}
	}

	/**
     * @param {string} [level] - The log level (e.g., 'INFO', 'DEBUG').
     * @param {string} [message] - The message to log.
     * @param {any} [context] - Additional context for the log message.
     * @throws {FileNotOpen} If the settings or the Log file isnt open.
     * @description Logs the message to the log file
     */
	public log(
		level: string,
		message: string,
		context?: undefined
	): void {
		const timestamp: string = new Date().toISOString().replace(/:/g, '-').replace(/T/, '_').replace(/\..+/, '');
		level = level.toUpperCase() // make the level upper case if it isn't

		if (this.log_file) { // if the log file exists
			if (this.settings) { // if the self.settings variable is not null
				const log_level_value: number = this.settings['LogLevels'][level]

				if (log_level_value && this.configured_level_value) {
					// check that the configured log level is lower than the given log level
					if (log_level_value >= this.configured_level_value) {
						if (timestamp) {
							if (context) {
								const formatted_message: string = this.Formatter(level, message, timestamp, context)
								if (this.hasPlugin('Log')) {
									if (!this.plugins) {
										throw new Error('You have a plugin but the plugins var is null')
									}
									const plugin = this.plugins.find(plugin => 'log' in plugin)
									plugin.execute(
										formatted_message,
										this.log_file,
									)
								}
								if (formatted_message !== null) {
									this.log_file.write(formatted_message)
									
								}
							} else {
								const formatted_message: string = this.Formatter(level, message, timestamp)
								if (this.hasPlugin('Log')) {
									if (!this.plugins) {
										throw new Error('You have a plugin but the plugins var is null')
									}
									const plugin = this.plugins.find(plugin => 'Log' in plugin)
									plugin.execute(
										formatted_message,
										this.log_file
									)
								}
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
    * @returns {string} The formatted message
    * @description Format the message
    */
	private Formatter(
		level: string,
		message: string, 
		timestamp: string, 
		context?: undefined
	): string {
		let formattedMessage: string = ''
	
		if (this.settings) {
			if (this.hasPlugin('Formatter')) {
				if (!this.plugins) {
					throw new Error('You have a plugin but the plugins var is null')
				}
				const plugin = this.plugins.find(plugin => 'formatter' in plugin)
				if (plugin) {
					formattedMessage = plugin.execute(
						level,
						message,
						timestamp, 
						this.settings['Formats'], 
						context
					)
				}
			} else {
				if (context) {
					// get the formats and then replace placeholders with values
					const format_template: string = this.settings['Formats']['Context']
					formattedMessage = format_template
						.replace('{level}', level)
						.replace('{timestamp}', timestamp)
						.replace('{message}', message)
						.replace('{context}', context)
				} else {
					const format_template: string = this.settings['Formats']['NonContext']
					formattedMessage = format_template
						.replace('{level}', level)
						.replace('{timestamp}', timestamp)
						.replace('{message}', message)
				}
			}
	
			if (formattedMessage !== undefined) {
				return formattedMessage + '\n'
			}
		} else {
			throw new FileNotOpen('Settings file is not open')
		}
		throw new Error('Formatter function reached an unexpected state.')
	}

	/**
     * @throws {PathNonExistant} If the path is null.
     * @description Create the log file in the specified directory.
     */
	private create_log_file(

	): void {

		// Determine if the output directory ends with ".log"
		const endsWith = this.file_path && this.file_path.endsWith('.log')
	
		// Determine the log file name based on the output directory and file extension
		const logFileName = endsWith ? this.file_path : this.get_log_name()
	
		// Determine if loggers with the same or default log path should combine their logs
		const combineLoggers = this.file_path === 'logs' || this.file_path === '.'

		if (this.hasPlugin('Create')) {
			if (!this.plugins) {
				throw new Error('You have a plugin but the plugins var is null')
			}
			const plugin = this.plugins.find(plugin => 'create' in plugin)
			this.log_file = plugin.execute(
				endsWith,
				logFileName,
				combineLoggers,
				this.file_path
			)
		} else {
			// Ensure the output directory exists
			if (this.file_path && !endsWith) {
				fs.mkdirSync(this.file_path, { recursive: true }) // Create the log directory if it doesn't exist
			} else if (!this.file_path) {
				throw new PathNonExistant('Output directory not specified') // Raise an error if output directory is not specified
			}
		
			try {
				if (logFileName) {
					
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
					}
				}
				
				// Check if the log file exists
				
			} catch (error) {
				throw new Error(`Error while creating log file: ${error}`)
			}
		}
		
	}
    
	/**
     * @throws {PathNonExistant} If file path is null.
     * @description Get the full path of the log file.
     * @returns {string} The full log file path.
     */
	private get_log_name(

	): string {
		if (this.hasPlugin('GetName')) {
			if (!this.plugins) {
				throw new Error('You have a plugin but the plugins var is null')
			}
			const plugin = this.plugins.find(plugin => 'getname' in plugin)
			return plugin.execute(this.file_path, this.log_file_name)
		} else {
			if (this.file_path) {
				return path.resolve(this.file_path, `${this.timestamp}.${this.log_file_type}`) // return the filepath and the name of the file
			} else {
				throw new PathNonExistant('File path not found') // raise an error if file path is  null
			}
		}
		
	}
	/**
    * @param {string} [path] - The path to be opened
    * @throws {PathNonExistant} If the file path does not exist
    * @description Opens json files
    */
	private load_settings(
		path: string
	): Settings {
		if (fs.existsSync(path)) {
			const data: string = fs.readFileSync(path, 'utf8')
			return JSON.parse(data)
		} else {
			throw new PathNonExistant('File path does not exist')
		}
	}

	/**
	 * @param {string} [methodName] - The name of the method to check for.
	 * @returns {boolean | null} - Returns true if the plugin exists, false if it doesn't, and null if plugins aren't defined and it's called
	 * @description Type guard to check if the plugin or plugins have the specified method.
	 */
	private hasPlugin(
		methodName: string
	): boolean | null {
		methodName = methodName.toLowerCase()
		if (this.plugins) {
			if (this.UsedPlugins.find(methodName => methodName in this.UsedPlugins)) {
				return true
			}
			return false
		}
		return null
	}

	/**
	 * @returns {Plugin[]} - Returns the Plugins
	 * @description - Loads all of the plugins from the specified path
	 */
	private loadPlugins(

	): PluginType[] {
		if (!this.pluginsPath || typeof this.pluginsPath !== 'object') {
			throw new PluginLoadingError('Invalid Plugin Path')
		}

		const plugins: PluginType[] = []

		for (let pluginName of this.UsedPlugins) {
			pluginName = pluginName as string
			try {
				const pluginPath = this.pluginsPath[pluginName]
				if (!pluginPath) {
					throw new PluginLoadingError(`Path for plugin ${pluginName} is not defined`)
				}
				const pluginModule = require(pluginPath)
				const PluginClass = pluginModule.default

				if (typeof PluginClass === 'function') {

					const pluginInstance = new PluginClass()

					if ('execute' in pluginInstance) {

						plugins.push(pluginInstance)
					} else {
						throw new PluginLoadingError(`Plugin ${pluginName} does not have an 'execute' method`)
					}
				} else {
					throw new PluginLoadingError(`Plugin ${pluginName} is not a valid class`)
				}
			} catch (error) {
				throw new PluginLoadingError(`Failed to load plugin ${pluginName}: ${error.message}`)
			}
		}

		return plugins
	}

	private loadStartupPlugins(
	): void{
		if (!this.pluginsPath || typeof this.pluginsPath !== 'object') {
			throw new PluginLoadingError('Invalid Plugin Path')
		}

		const plugins: StartupPlugin[] = []

		for (let pluginName of this.UsedStartupPlugins) {
			pluginName = pluginName as string
			try {
				const pluginPath = this.StartupPluginsPath[pluginName]
				if (!pluginPath) {
					throw new PluginLoadingError(`Path for plugin ${pluginName} is not defined`)
				}
				const pluginModule = require(pluginPath)
				const PluginClass = pluginModule.default

				if (typeof PluginClass === 'function') {
					const pluginInstance = new PluginClass()

					if ('execute' in pluginInstance) {

						const plugin = new pluginInstance
						plugin.execute(this)
					} else {

						throw new PluginLoadingError(`Plugin ${pluginName} does not have an 'execute' method`)
					}
				} else {

					throw new PluginLoadingError(`Plugin ${pluginName} is not a valid class`)
				}
			} catch (error) {

				throw new PluginLoadingError(`Failed to load plugin ${pluginName}: ${error.message}`)
			}
		}
	}
	
	/**
     * @throws {FileNotOpen} If the log file is not open 
     * @description Closes the current log file
     */
	public close(

	): void {

		if (this.log_file) {

			if (this.hasPlugin('close')) {

				if (!this.plugins) {

					throw new Error('You have a plugin but the plugins var is null')
				}

				const plugin = this.plugins.find(plugin => 'close' in plugin)

				plugin.execute(this.log_file, this.open_loggers, this.log_file_name)
			} else {

				try {

					this.log('info', 'Closing file')
				} finally {
					
					this.log_file.close()
					delete this.open_loggers[String(this.log_file_name)]
					this.log_file = null
				}
			}
		} else {

			throw new FileNotOpen('Log file is not open')
		}
	}
}