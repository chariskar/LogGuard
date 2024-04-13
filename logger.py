# imports
import datetime
import sys
from pathlib import Path
import threading

import json
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
    


class Logger:
    open_loggers_lock = threading.Lock()  # Lock for synchronizing access to open_loggers
    open_loggers = {}  # Thread-safe dictionary to store open loggers

    def __init__(
        self, output_dir: str = "logs",
        log_file_type: str = "log",
        settings_path: str = './log_settings.json'
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
        self.lock = None
        try:
            self.lock = threading.Lock()
        except Exception as e:
            raise Errors.UnableToLock(f"Unable to get process lock with error {e}")

        self.settings = None
        self.file_path = None
        self.timestamp = datetime.datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
        self.supported_formats = ["log", "txt"]
        
        if log_file_type in self.supported_formats:
            self.log_file_type = log_file_type
        else:
            raise ValueError("Log file type isn't supported")

        if output_dir == ".":
            self.file_path = Path.cwd().resolve()
        else:
            self.file_path = Path(output_dir).resolve()

        self.log_file = None
        self.create_log_file()
        self.log_file_name = None
        
        self.settings_path = settings_path
        if self.settings_path == './log_settings.json':
            with open(self.settings_path, 'r') as f:
                self.settings = json.load(f)
        else:
            if Path(self.settings_path).resolve():
                with open(self.settings_path, 'r') as f:
                    self.settings = json.load(f)
            else:
                raise Errors.PathNonExistant('File path does not exist')
            
    @staticmethod
    def format(*args):
        """
        Args:
            *args: tuple

        Returns:
            Formated str
        """
        return " ".join(map(str, args))  # format the arguments into a string with spaces in between

    def log(self, level: str, message: str):
        """
        Args:
            level: LogLevel:
                  The severity of the log based on the LogLevel enum.
            message: str:
                   The content of the log message.

        Summary:
            Make a new log to the log file.

        Raises:
            FileNotOpen: If log file is not open.
            UnableToLock: If the script cant acquire a thread lock

        """
        timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H-%M-%S")  # get the timestamp
        message = self.format(message)  # format the args
        level = level.upper() # make the level upper case if it isnt
        if self.lock:
            with self.lock:
                if self.log_file: # if the log file exists
                    if self.settings: # if the self.settings variable is not none 
                        if level in self.settings['LogLevels']: #check if the level is in the configured levels
                            self.log_file.write(
                                f"[{timestamp}] [{level}] {message}" + "\n"
                            )  # write the formatted message to the log file
                        else:
                            raise Errors.LevelNotSupported(f'{level} is not a member of your Levels')
                else:
                    raise Errors.FileNotOpen("Log file is not open")  # raise FileNotOpen if file is not open
        else:
            raise Errors.UnableToLock("Self.lock is None or false for some reason")

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

    def close(self):
        """
        Close the current Log file.

        Raises:
            FileNotOpen: if file is not open
        """
        if self.log_file:  # check if the file exists
            self.log('info', "Closing file")  # add a closing message
            self.log_file.close()  # close the file
            self.log_file = None  # set the file to none
        else:
            raise Errors.FileNotOpen("Log file is not open")  # raise FileNotOpen error if file is not open
