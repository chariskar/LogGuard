# imports
import datetime
import sys
from pathlib import Path
import threading
import json
# TODO: Write documentation
__all__ = [
    "Logger",
]


class Errors:
    """Contains Custom Errors"""

    class FileNotOpen(Exception):
        """FileNotOpen Error"""
        
        
        pass
        
    class PathNonExistant(Exception):
        """PathNoneExistant Error"""

        pass

    class LevelNotSupported(Exception):
        """LevelNotSupported Error"""
        pass

    class UnableToLock(Exception):
        """UnableToLock Error"""
        
        pass
        
    class LockNonExistant(Exception):
        """LockNonExistant Error"""

        
        pass

class Logger:
    open_loggers_lock = threading.Lock()  # Lock for synchronizing access to open_loggers
    open_loggers = {}  # Thread-safe dictionary to store open loggers

    def __init__(
            self, output_dir: str = "logs",
            log_file_type: str = "log",
            settings_path: str = './log_settings.json',
            LogLevel: str = 'INFO'
    ):
        """
        Args:
            output_dir (str, optional): the output location. Defaults to 'logs'.
            log_file_type (str, optional): the file log type. Defaults to 'log'.
            settings_path (str,optional): the settings path. Defaults to './log_settings.json'.

        Raises:
            ValueError: If the log file type isnt supported.
            PathNonExistant: If the log file path does not exist.
            FileNotOpen: If the log file is not open.
            PathNoneExistant: If the log settings file path does not exist.
            UnableToLock: If the script is unable to get a thread lock.
        """
        # get thread lock
        self.lock = None

        try:
            # Attempt to create a thread lock
            self.lock = threading.Lock()

        except Exception as e:
            # Raise an error if unable to create a thread lock
            raise Errors.UnableToLock(f"Unable to get process lock with error {e}")

        # Set log level to upper case
        self.loglevel = LogLevel.upper()

        # Initialise variables
        self.settings = None
        self.configured_level_value = None
        self.file_path = None
        self.log_file = None
        self.log_file_name = None
        self.timestamp = None

        # Assign values
        # Set timestamp to current date and time in the specified format
        self.timestamp = datetime.datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
        # List of supported log file formats
        self.supported_formats = ["log", "txt"]
        # If settings are available, set configured log level value

        # Check log file type
        if log_file_type in self.supported_formats:
            # Set log file type
            self.log_file_type = log_file_type
        else:
            # Raise an error if log file type is not supported
            raise ValueError("Log file type isn't supported")

        if self.lock:
                with self.lock:
                    # Check for the output directory
                    if output_dir == ".":
                        # If output directory is current directory, set file path to current working directory
                        
                        self.file_path = Path.cwd().resolve()
                    else:
                        # Otherwise, set file path to specified directory
                        self.file_path = Path(output_dir).resolve()

        # Check the settings file path
        self.settings_path = settings_path
        

        self.load_json(self.settings_path)

        if self.settings:
            self.configured_level_value = self.settings['LogLevels'][self.loglevel]

        # Create the log file
        self.create_log_file()

    def log(self, level: str, message: str, context=None):
        """
        Args:
            level (str): The log level.
            message (str): The log message.
            context (dict, optional): Contextual information to be included in the log message. Defaults to None.

        Summary:
            Make a new log to the log file.

        Raises:
            FileNotOpen: If log file is not open.
            LockNonExistant: If the script doesnt have a lock.
            FileNotOpen: If the log file is not open.
            
        """
        timestamp = datetime.datetime.now().strftime("%Y-%m-%d-%H-%M-%S")

        level = level.upper()  # make the level upper case if it isn't
        if self.lock:

            with self.lock:

                if self.log_file:  # if the log file exists

                    if self.settings:  # if the self.settings variable is not None

                        log_level_value: int = self.settings['LogLevels'][level]

                        if log_level_value and self.configured_level_value:
                            # check that the configured log level is lower than the given log level
                            if log_level_value >= self.configured_level_value:
                                if timestamp:
                                    # write the formatted message to the log file
                                    if context:
                                        formatted_message = self.Formatter(level, message, timestamp, True,
                                                                           context=context)

                                        if formatted_message is not None:
                                            self.log_file.write(formatted_message)
                                            self.log_file.flush()

                                    else:
                                        formatted_message = self.Formatter(level, message, str(timestamp))
                                        if formatted_message is not None:
                                            self.log_file.write(formatted_message)
                                            self.log_file.flush()


                            else:
                                # Log level is lower than configured level, do nothing
                                pass
                    else:
                        raise Errors.FileNotOpen('Settings file is not open')
                else:
                    raise Errors.FileNotOpen('Log file is not open')
        else:
            raise Errors.LockNonExistant("Self.lock is None or false for some reason contact dev ")

    def Formatter(self, level: str, message: str, timestamp: str, context_value: bool = False, context: object = None):
        """
            Args:
                level(str,required):The level.
                message(str,required):The message.
                timestamp(str,required): The timestamp.
                context_value(bool,optional): If the logger should use the context Format.
                context(dict,optional): The context to add .
            Returns:
                Formatted message.
            Raises:
                FileNotOpen: If the settings file is not open.
        """
        if self.settings:
            if context_value:
                if context:
                    format_template = self.settings['Formats']['Context']
                    formatted_message = format_template.format(
                                                                level=level,
                                                                message=message,
                                                                timestamp=timestamp,
                                                                context=context)
                    return formatted_message + "\n"
            else:
                format_template = self.settings['Formats']['NonContext']
                formatted_message = format_template.format(level=level, message=message, timestamp=timestamp, )
                return formatted_message + "\n"
        else:
            raise Errors.FileNotOpen('Settings file is not open')

    def create_log_file(self):
        """
            Generate the log file
        Raises:
            PathNonExistant: If the file path is not found
        """
        self.log_file_name = self.get_log_name()  # get the log file name

        if self.file_path:

            self.file_path.mkdir(parents=True, exist_ok=True)  # make the log dir if it doesn't exist
        else:
            raise Errors.PathNonExistant("File path not found")  # raise an error if file path is  None
        try:
            if self.log_file_name in Logger.open_loggers:  # check if there is an already open logger file

                self.log_file = Logger.open_loggers[self.log_file_name]  # open that logger file
            else:
                self.log_file = open(str(self.log_file_name), "a")  # if there isn't an open logger file make one

                Logger.open_loggers[self.log_file_name] = self.log_file  # open that file

                self.log('info', "Starting")  # set a starting message
        except IOError:

            sys.stderr.write(f"Error: Unable to open log file {self.log_file_name}\n")

    def get_log_name(self):
        """
        Raises:
            PathNonExistant: If file path is not found

        Returns:
            The log file path and the name of it
        """
        if self.file_path:
            return (
                    self.file_path / f"{self.timestamp}.{self.log_file_type}"
            )  # return the filepath and the name of the file
        else:
            raise Errors.PathNonExistant("File path not found")  # raise an error if file path is  None
        
    def load_json(
        self,
        path: str
        ):
            if self.lock:
                with self.lock:
                    if Path(path).resolve():
                        with open(path,'r') as f:
                            return json.load(f)
                    else:
                        raise Errors.PathNonExistant('File path does not exist')
            else:
                raise Errors.LockNonExistant('Thread lock does not exist please contact dev')

    def close(self):
        """
        Close the current Log file.

        Raises:
            FileNotOpen: if file is not open.
            LockNonExistant: If the script doesnt have a lock.
        """
        if self.log_file:

            try:

                self.log('info', "Closing file")

            finally:
                if self.lock:
                    with self.lock:
                        self.log_file.close()

                        with self.open_loggers_lock:

                            if self.log_file_name in self.open_loggers:
                                del self.open_loggers[self.log_file_name]

                        self.log_file = None
                        
                        self.lock.release()

                else:
                    Errors.LockNonExistant('Threadding lock is none or False for some reason contact dev')
        else:

            raise Errors.FileNotOpen("Log file is not open")
