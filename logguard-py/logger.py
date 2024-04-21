import datetime
import sys
from pathlib import Path
import threading
import json

__all__ = ["Logger"]

# Custom Errors
class Errors:
    """Contains Custom Errors"""

    class FileNotOpen(Exception):
        """FileNotOpen Error"""
        

    class PathNonExistent(Exception):
        """PathNonExistent Error"""
        

    class LevelNotSupported(Exception):
        """LevelNotSupported Error"""

    class UnableToLock(Exception):
        """UnableToLock Error"""

    class LockNonExistent(Exception):
        """LockNonExistent Error"""

class Logger:
    """
        Initialize Logger instance.

        Args:
            output_dir (str, optional): the output location. Defaults to 'logs'.
            log_file_type (str, optional): the file log type. Defaults to 'log'.
            settings_path (str, optional): the settings path. Defaults to './log_settings.json'.
            log_level (str, optional): the log level. Defaults to 'INFO'.

        Raises:
            ValueError: If the log file type isn't supported.
            PathNonExistent: If the log file path does not exist.
            FileNotOpen: If the log file is not open.
            PathNonExistent: If the log settings file path does not exist.
            UnableToLock: If the script is unable to get a thread lock.
        """
    open_loggers_lock = threading.Lock()  # Lock for synchronizing access to open_loggers
    open_loggers = {}  # Thread-safe dictionary to store open loggers

    def __init__(self,
                 output_dir: str = "logs",
                 log_file_type: str = "log",
                 settings_path: str = './log_settings.json',
                 log_level: str = 'INFO'):
        """
        Initialize Logger instance.

        Args:
            output_dir (str, optional): the output location. Defaults to 'logs'.
            log_file_type (str, optional): the file log type. Defaults to 'log'.
            settings_path (str, optional): the settings path. Defaults to './log_settings.json'.
            log_level (str, optional): the log level. Defaults to 'INFO'.

        Raises:
            ValueError: If the log file type isn't supported.
            PathNonExistent: If the log file path does not exist.
            FileNotOpen: If the log file is not open.
            PathNonExistent: If the log settings file path does not exist.
            UnableToLock: If the script is unable to get a thread lock.
        """
        self.lock = None

        try:
            # Attempt to create a thread lock
            self.lock = threading.Lock()
        except Exception as e:
            # Raise an error if unable to create a thread lock
            raise Errors.UnableToLock(f"Unable to get process lock with error {e}")

        # Set log level to upper case
        self.log_level = log_level.upper()

        # Initialize variables
        self.settings = None
        self.configured_level_value = None
        self.file_path = None
        self.log_file = None
        self.log_file_name = None
        self.timestamp = None

        # Assign values
        self.timestamp = datetime.datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
        self.supported_formats = ["log", "txt"]
        self.log_file_type = log_file_type if log_file_type in self.supported_formats else 'log'
        self.file_path = Path.cwd().resolve() if output_dir == "." else Path(output_dir).resolve()
        self.settings_path = settings_path
        self.load_json(self.settings_path)
        if self.settings:
            self.configured_level_value = self.settings['LogLevels'][self.log_level]

        # Create the log file
        self.create_log_file()

    def log(self, level: str, message: str, context=None):
        """
        Make a new log to the log file.

        Args:
            level (str): The log level.
            message (str): The log message.
            context (dict, optional): Contextual information to be included in the log message.

        Raises:
            FileNotOpen: If log file is not open.
            LockNonExistent: If the script doesn't have a lock.
            FileNotOpen: If the log file is not open.
        """
        timestamp = datetime.datetime.now().strftime("%Y-%m-%d-%H-%M-%S")
        level = level.upper()

        if self.lock:
            with self.lock:
                if self.log_file:
                    if self.settings:
                        log_level_value = self.settings['LogLevels'][level]
                        if log_level_value and self.configured_level_value:
                            if log_level_value >= self.configured_level_value:
                                if timestamp:
                                    if context:
                                        formatted_message = self.formatter(
                                                                        level, message,
                                                                           timestamp,
                                                                           context=context)
                                    else:
                                        formatted_message = self.formatter(level, message,
                                                                           str(timestamp))

                                    if formatted_message is not None:
                                        self.log_file.write(formatted_message)
                                        self.log_file.flush()
                            else:
                                pass
                    else:
                        raise Errors.FileNotOpen('Settings file is not open')
                else:
                    raise Errors.FileNotOpen('Log file is not open')
        else:
            raise Errors.LockNonExistent("Self.lock is None or false for some reason contact dev ")

    def formatter(self, level: str, message: str, timestamp: str, context: object = None):
        """
        Format log message.

        Args:
            level (str): The log level.
            message (str): The log message.
            timestamp (str): The timestamp.
            context (dict, optional): The context to add.

        Returns:
            str: Formatted log message.

        Raises:
            FileNotOpen: If the settings file is not open.
        """
        if self.settings:
            if context:
                format_template = self.settings['Formats']['Context']
                formatted_message = format_template.format(level=level, message=message,
                                                           timestamp=timestamp, context=context)
            else:
                format_template = self.settings['Formats']['NonContext']
                formatted_message = format_template.format(level=level, message=message
                                                           , timestamp=timestamp)
                
            return formatted_message + "\n"
        raise Errors.FileNotOpen('Settings file is not open')

    def create_log_file(self):
        """
        Generate the log file.

        Raises:
            PathNonExistent: If the file path is not found.
        """
        self.log_file_name = self.get_log_name()

        if self.file_path:
            self.file_path.mkdir(parents=True, exist_ok=True)
        else:
            raise Errors.PathNonExistent("File path not found")

        try:
            if self.log_file_name in Logger.open_loggers:
                self.log_file = Logger.open_loggers[self.log_file_name]
            else:
                with open(str(self.log_file_name), "a",encoding="utf-8") as log_file: 
                    self.log_file = log_file
                Logger.open_loggers[self.log_file_name] = self.log_file
                self.log('info', "Starting")
        except IOError:
            sys.stderr.write(f"Error: Unable to open log file {self.log_file_name}\n")

    def get_log_name(self):
        """
        Get the log file name.

        Returns:
            str: The log file path and the name of it.

        Raises:
            PathNonExistent: If file path is not found.
        """
        if self.file_path:
            return self.file_path / f"{self.timestamp}.{self.log_file_type}"
        raise Errors.PathNonExistent("File path not found")

    def load_json(self, path: str):
        """
        Load JSON settings.

        Args:
            path (str): The path to the JSON settings file.

        Raises:
            PathNonExistent: If the file path does not exist.
            LockNonExistent: If the script doesn't have a lock.
        """
        if self.lock:
            with self.lock:
                if Path(path).resolve():
                    with open(path, 'r',encoding="utf-8") as f:
                        self.settings = json.load(f)
                else:
                    raise Errors.PathNonExistent('File path does not exist')
        else:
            raise Errors.LockNonExistent('Thread lock does not exist, please contact dev')

    def close(self):
        """
        Close the current log file.

        Raises:
            FileNotOpen: If file is not open.
            LockNonExistent: If the script doesn't have a lock.
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
                    raise Errors.LockNonExistent('Threading lock is None or False for some reason')
        raise Errors.FileNotOpen("Log file is not open")
        