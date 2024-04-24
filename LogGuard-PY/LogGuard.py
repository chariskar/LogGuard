import datetime
import sys
from pathlib import Path
import threading
import json

__all__ = ["Logger"]

# Custom __Errors
class __Errors:
    """Contains Custom Errors"""

    class FileNotOpen(Exception):
        """FileNotOpen Error"""
        

    class PathNonExistent(Exception):
        """PathNonExistent Error"""

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
    __open_loggers_lock = threading.Lock()  # Lock for synchronizing access to open_loggers
    __open_loggers = {}  # Thread-safe dictionary to store open loggers

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
        self.__lock = None

        try:
            # Attempt to create a thread lock
            self.__lock = threading.Lock()
        except Exception as e:
            # Raise an error if unable to create a thread lock
            raise __Errors.UnableToLock(f"Unable to get process lock with error {e}")

        # Set log level to upper case
        self.log_level = log_level.upper()

        # Initialize variables
        self.__settings = None
        self.configured_level_value = None
        self.file_path = None
        self.__log_file = None
        self.__log_file_name = None
        self._timestamp = None

        # Assign values
        self.timestamp = datetime.datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
        self.supported_formats = ["log", "txt"]
        self.__log_file_type = log_file_type if log_file_type in self.supported_formats else 'log'
        self._file_path = Path.cwd().resolve() if output_dir == "." else Path(output_dir).resolve()
        self.__settings_path = settings_path
        self.__load_json(self.__settings_path)
        if self.__settings:
            self.configured_level_value = self.__settings['LogLevels'][self.log_level]

        # Create the log file
        self.__create_log_file()

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

        if self.__lock:
            with self.__lock:
                if self.__log_file:
                    if self.__settings:
                        log_level_value = self.__settings['LogLevels'][level]
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
                                        self.__log_file.write(formatted_message)
                                        self.__log_file.flush()
                            else:
                                pass
                    else:
                        raise __Errors.FileNotOpen('Settings file is not open')
                else:
                    raise __Errors.FileNotOpen('Log file is not open')
        else:
            raise __Errors.LockNonExistent("Self.lock is None or false for some reason contact dev ")

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
        if self.__settings:
            if context:
                format_template = self.__settings['Formats']['Context']
                formatted_message = format_template.format(level=level, message=message,
                                                           timestamp=timestamp, context=context)
            else:
                format_template = self.__settings['Formats']['NonContext']
                formatted_message = format_template.format(level=level, message=message
                                                           , timestamp=timestamp)
                
            return formatted_message + "\n"
        raise __Errors.FileNotOpen('Settings file is not open')

    def __create_log_file(self):
        """
        Generate the log file.

        Raises:
            PathNonExistent: If the file path is not found.
        """
        self.__log_file_name = self.__get_log_name()

        if self.file_path:
            self.file_path.mkdir(parents=True, exist_ok=True)
        else:
            raise __Errors.PathNonExistent("File path not found")

        try:
            if self.__log_file_name in Logger.__open_loggers:
                self.__log_file = Logger.__open_loggers[self.__log_file_name]
            else:
                with open(str(self.__log_file_name), "a",encoding="utf-8") as log_file: 
                    self.__log_file = log_file

                Logger.__open_loggers[self.__log_file_name] = self.__log_file
                self.log('info', "Starting")
        except IOError:
            sys.stderr.write(f"Error: Unable to open log file {self.__log_file_name}\n")

    def __get_log_name(self):
        """
        Get the log file name.

        Returns:
            str: The log file path and the name of it.

        Raises:
            PathNonExistent: If file path is not found.
        """
        if self.file_path:
            return self.file_path / f"{self.timestamp}.{self.__log_file_type}"
        raise __Errors.PathNonExistent("File path not found")

    def __load_json(self, path: str):
        """
        Load JSON settings.

        Args:
            path (str): The path to the JSON settings file.

        Raises:
            PathNonExistent: If the file path does not exist.
            LockNonExistent: If the script doesn't have a lock.
        """
        if self.__lock:
            with self.__lock:
                if Path(path).resolve():
                    with open(path, 'r',encoding="utf-8") as f:
                        self.__settings = json.load(f)
                else:
                    raise __Errors.PathNonExistent('File path does not exist')
        else:
            raise __Errors.LockNonExistent('Thread lock does not exist, please contact dev')

    def close(self):
        """
        Close the current log file.

        Raises:
            FileNotOpen: If file is not open.
            LockNonExistent: If the script doesn't have a lock.
        """
        if self.__log_file:
            try:
                self.log('info', "Closing file")
            finally:
                if self.__lock:
                    with self.__lock:
                        self.__log_file.close()
                        with self.__open_loggers_lock:
                            if self.__log_file_name in self.__open_loggers:
                                del self.__open_loggers[self.__log_file_name]
                        self.__log_file = None
                        self.__lock.release()
                else:
                    raise __Errors.LockNonExistent('Threading lock is None or False for some reason')
        raise __Errors.FileNotOpen("Log file is not open")
        