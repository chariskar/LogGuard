import * as fs from 'fs';
import * as path from 'path';


class FileNotOpen extends Error {} // FileNotOpen Error
class PathNonExistant extends Error {} // PathNonExistant Error

// Settings format
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

    private loglevel: string;
    private open_loggers: Record<string, fs.WriteStream> = {};
    private settings: Settings;
    private configured_level_value: number | null;
    private file_path: string | null;
    private log_file: fs.WriteStream | null;
    private log_file_name: string;
    private timestamp: string | null;
    private supported_formats: string[] = ['log','txt']
    private log_file_type: string
    private settings_path: string

    constructor(output_dir: string = 'logs', log_file_type: string = 'log', settings_path: string = './log_settings.json', LogLevel: string = 'INFO') {
        // Set log level to upper case
        this.loglevel = LogLevel.toUpperCase();
        
        // Initialise variables.
;

        // Assign values
        // Set timestamp to current date and time in the specified format
        this.timestamp = new Date().toISOString().replace(/:/g, '-').replace(/T/, '_').replace(/\..+/, '');
        // List of supported log file formats
        this.supported_formats = ['log', 'txt'];
        // If settings are available, set configured log level value

        // Check log file type
        if (this.supported_formats.includes(log_file_type)) {
            // Set log file type
            this.log_file_type = log_file_type;
        } else {
            // Raise an error if log file type is not supported
            throw new Error('Log file type isn\'t supported');
        }

        // Check for the output directory
        if (output_dir === '.') {
            // If output directory is current directory, set file path to current working directory
            this.file_path = path.resolve();
        } else {
            // Otherwise, set file path to specified directory
            this.file_path = path.resolve(output_dir);
        }

        // Check the settings file path
        this.settings_path = settings_path;
        this.load_json(this.settings_path);

        if (this.settings) {
            this.configured_level_value = this.settings['LogLevels'][this.loglevel];
        }

        // Create the log file
        this.create_log_file(); // Ensure log file is created during initialization
    }

     /**
     * @param {string} [level] - The log level (e.g., 'INFO', 'DEBUG').
     * @param {string} [message] - The message to log.
     * @param {any} [context] - Additional context for the log message.
     * @throws {FileNotOpen} If the settings or the Log file isnt open.
     * @description Logs the message to the log file
     */
    log(level: string, message: string, context: any): void {
        
        const timestamp: string = new Date().toISOString().replace(/:/g, '-').replace(/T/, '_').replace(/\..+/, '');
        level = level.toUpperCase(); // make the level upper case if it isn't

        if (this.log_file) { // if the log file exists
            if (this.settings) { // if the self.settings variable is not null
                const log_level_value: number = this.settings['LogLevels'][level];

                if (log_level_value && this.configured_level_value) {
                    // check that the configured log level is lower than the given log level
                    if (log_level_value >= this.configured_level_value) {
                        if (timestamp) {
                            // write the formatted message to the log file
                            if (context) {
                                const formatted_message: string = this.Formatter(level, message, timestamp, context);
                                if (formatted_message !== null) {
                                    this.log_file.write(formatted_message);
                                    
                                }
                            } else {
                                const formatted_message: string = this.Formatter(level, message, timestamp, null);
                                if (formatted_message !== null) {
                                    this.log_file.write(formatted_message);
                                    
                                }
                            }
                        }
                    }
                } else {
                    // Log level is lower than configured level, do nothing
                }
            } else {
                throw new FileNotOpen('Settings file is not open');
            }
        } else {
            throw new FileNotOpen('Log file is not open');
        }
    }

    /**
    * @param {string} [level] -The severity level.
    * @param {string} [message] - The message to be logged.
    * @param {string} [timestamp] - The time at which the message was logged.
    * @param {any} [context] - The context to be logged.
    * @throws {FileNotOpen} If the settings file is not open.
    * @returns {string} The formated message
    * @description Format the message
    */
    Formatter(level: string, message: string, timestamp: string,  context: any): string {
        if (this.settings) {
            if (context) {
                // get the formats and then replace  placeholders with values
                const format_template: string = this.settings['Formats']['Context'];
                const formatted_message: string = format_template
                        .replace('{level}', level)
                        .replace('{message}', message)
                        .replace('{timestamp}', timestamp)
                        .replace('{context}', context);
                    return formatted_message + '\n';
                
            } else {
                const format_template: string = this.settings['Formats']['NonContext'];
                const formatted_message: string = format_template
                    .replace('{level}', level)
                    .replace('{message}', message)
                    .replace('{timestamp}', timestamp);
                return formatted_message + '\n';
            }
        } else {
            throw new FileNotOpen('Settings file is not open');
        }
    }

    /**
     * @throws {PathNonExistant} If the the path is null.
     * @description Create the log file in the specified directory.
     */
    create_log_file(): void {
        this.log_file_name = this.get_log_name(); // get the log file name
    
        if (this.file_path) {
            fs.mkdirSync(this.file_path, { recursive: true }); // make the log dir if it doesn't exist
        } else {
            throw new PathNonExistant('File path not found'); // raise an error if file path is  null
        }
    
        try {
            if (this.log_file_name in this.open_loggers) { // check if there is an already open logger file
                this.log_file = this.open_loggers[this.log_file_name]; // open that logger file
            } else {
                if (!fs.existsSync(this.log_file_name)) { // check if log file exists
                    fs.writeFileSync(this.log_file_name, ''); // create the log file if it doesn't exist
                }
                this.log_file = fs.createWriteStream(this.log_file_name, { flags: 'a' }); // open the log file
                this.open_loggers[this.log_file_name] = this.log_file; // store the opened logger file
                this.log('info', 'Starting', null); // set a starting message
            }
        } catch (error) {

            throw new Error(`Unexpected Error ${error}`)
        }
    }

    /**
     * @throws {PathNonExistant} If file path is null.
     * @description Get the full path of the log file.
     * @returns {string} The full log file path.
     */
    get_log_name(): string {
        if (this.file_path) {
            return path.resolve(this.file_path, `${this.timestamp}.${this.log_file_type}`); // return the filepath and the name of the file
        } else {
            throw new PathNonExistant('File path not found'); // raise an error if file path is  null
        }
    }
    /**
    * @param {string} [path] - The path to be opened
    * @throws {PathNonExistant} If the file path does not exist
    * @description Opens json files
    */
    load_json(path: string): void {
        if (fs.existsSync(path)) {
            const data: string = fs.readFileSync(path, 'utf8');
            this.settings = JSON.parse(data);
        } else {
            throw new PathNonExistant('File path does not exist');
        }
    }

     /**
     *@throws {FileNotOpen} If the log file is not open 
     *@description Closes the current log file
     */
    close(): void {
        if (this.log_file) {
            try {
                this.log('info', 'Closing file',null);
            } finally {
                this.log_file.close();
                delete this.open_loggers[this.log_file_name];
                this.log_file = null;
            }
        } else {
            throw new FileNotOpen('Log file is not open');
        }
    }
}

export { Logger };
