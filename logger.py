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

    open_loggers = {}  # initialise the open loggers var

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
        self.lock = None # initialise the lock variable
        try:
            self.lock = threading.Lock() # grab the lock
        except Exception as e:
            raise Errors.UnableToLock(f"Unable to get process lock with error {e}")# raise error if the script cant get error
        self.settings = None # initiallise 
        self.file_path = None  # initially set the file path to None
        self.timestamp: str = str(datetime.datetime.now().strftime("%Y-%m-%d_%H-%M-%S"))  # set the start timestamp
        self.supported_formats = ["log", "txt"]  # log formats
        if log_file_type in self.supported_formats:  # check if the format is supported
            pass
        else:
            raise ValueError("Log file type isnt supported")  # raise value error
        self.log_file_type = log_file_type
        if output_dir == ".":  # check if the output dir isnt the base dir
            self.file_path = Path.cwd().resolve()  # set it to the absolute path
        else:
            self.file_path = Path(output_dir).resolve()  # set the log file path
        self.log_file = None  # initialise the log file
        self.create_log_file()  # create the log file when activating the class
        self.log_file_name = None # initialise the log file name
        
        self.settings_path = settings_path # set the settings path variable
        if self.settings_path == './log_settings.json': # if the path is the default then proceed
            with open(self.settings_path, 'r') as f:
                self.settings = json.load(f) # load the settings
        else: # else check if the path exists and then open it if it does not exist raise PathNonExistant
            if Path(self.settings_path).resolve():
                with open(self.settings_path, 'r') as f:
                    self.settings = json.load(f) # load the settingss   
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
        level = level.upper()
        if self.lock:
            with self.lock:
                if self.log_file:
                    if self.settings:
                        if level in self.settings['LogLevels']:
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
