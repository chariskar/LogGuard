"""logger module"""
import datetime
from pathlib import Path
import threading
import json
from typing import List, Union
from Types import Plugin, PluginType, Formatter, Log, LoadJson, CreateLogFile, Close, GetLogFileName

__all__ = ["Logger"]
__author__ = 'Charilaos Karametos'


# Custom Errors
class Errors:
    """Contains Custom Errors"""

    class FileNotOpen(Exception):
        """FileNotOpen Error"""  

    class PathNonExistent(Exception):
        """PathNonExistent Error"""

    class UnableToLock(Exception):
        """UnableToLock Error"""

    class LockNonExistent(Exception):
        """LockNonExistent Error"""
    class PluginLoadingError(Exception):
        """Unable to load plugin."""


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
                log_level: str = 'INFO',
                used_plugins: Union[PluginType, List[PluginType], None] = None,
                plugins_path: str = './Plugins',
                ):
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
            raise Errors.UnableToLock(f"Unable to get process lock with error {e}")

        # Set log level to upper case
        self.log_level = log_level.upper()

        # Initialize variables
        self.__settings = None
        self.configured_level_value = None
        self.file_path = None
        self.__log_file = None
        self.__log_file_name = None
        self._timestamp = None
        self.used_plugins = None
        self.plugin_path = None        # Assign values
        self.timestamp = datetime.datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
        self.supported_formats = ["log", "txt"]
        self.__log_file_type = log_file_type if log_file_type in self.supported_formats else 'log'
        self._file_path = Path.cwd().resolve() if output_dir == "." else Path(output_dir).resolve()
        self.__settings_path = settings_path
        self.__load_json(self.__settings_path)
        if self.__settings:
            self.configured_level_value = self.__settings['LogLevels'][self.log_level]
        self.used_plugins = used_plugins
        self.plugin_path = plugins_path
        self.plugins: List[PluginType] = self.load_plugins()
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

        if self.__lock:
            with self.__lock:
                
                if self.__settings and self.__log_file:
                    
                    if self.has_plugin(self.plugins,'Log'):
                        
                        plugin = next((plugin for plugin in self.plugins if hasattr(plugin, 'Log')), None)
                        
                        if plugin and hasattr(plugin, 'Log') and isinstance(plugin, Log):
                            
                            return plugin.func(level, message, timestamp, context=context)
                        
                    else:
                        
                        log_level_value = self.__settings['LogLevels'][level]
                        
                        if log_level_value and self.configured_level_value:
                            
                            if log_level_value >= self.configured_level_value:
                                
                                if timestamp:
                                    
                                    if context:
                                        
                                        formatted_message = self.formatter(
                                                                        level,
                                                                        message,
                                                                        timestamp,
                                                                        context=context)
                                    else:
                                        
                                        formatted_message = self.formatter(
                                                                        level,
                                                                        message,
                                                                        str(timestamp))
                                        
                                    if formatted_message is not None:
                                        
                                        self.__log_file.write(formatted_message)
                                        self.__log_file.flush()
                            else:
                                pass
                else:
                    raise Errors.FileNotOpen('Settings or Log File  file is not open')

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
        if self.__settings:
            
            if self.has_plugin(self.plugins, 'Formatter'):
                
                plugin = next((plugin for plugin in self.plugins if hasattr(plugin, 'Formatter')), None)
                
                if plugin and hasattr(plugin, 'Formatter') and isinstance(plugin, Formatter):
                    
                    return plugin.func(level, message, timestamp,self.__settings, context=context)
                
            if context:
                
                format_template = self.__settings['Formats']['Context']
                
                formatted_message = format_template.format(
                                                        level=level,
                                                        message=message,
                                                        timestamp=timestamp,
                                                        context=context)
            else:
                format_template = self.__settings['Formats']['NonContext']
                
                formatted_message = format_template.format(
                                                        level=level,
                                                        message=message,
                                                        timestamp=timestamp)
            return formatted_message + "\n"
        raise Errors.FileNotOpen('Settings file is not open')

    def create_log_file(self):
        """
        Create the log file in the specified directory.

        Raises:
            PathNonExistent: If the path is null.
        """
        
        # Determine if the output directory ends with ".log"
        ends_with_log = self.file_path and self.file_path.endswith('.log')

        # Determine the log file name based on the output directory and file extension
        log_file_name = self.file_path if ends_with_log else self.get_log_name()

        # Determine if loggers with the same or default log path should combine their logs
        combine_loggers = self.file_path in ['logs', '.']
        
        if self.has_plugin(self.plugins, 'CreateLogFile'):
            
            plugin = next((plugin for plugin in self.plugins if hasattr(plugin, 'CreateLogFile')), None)
        
            if plugin and hasattr(plugin, 'CreateLogFile') and isinstance(plugin, CreateLogFile):
                    
                return plugin.func(log_file_name, ends_with_log, combine_loggers)
        else:
            # Ensure the output directory exists
            if self.file_path and not ends_with_log:                
                
                Path(self.file_path).mkdir(parents=True, exist_ok=True)
                
            elif not self.file_path:
                
                raise Errors.PathNonExistent('Output directory not specified')  # Raise an error if output directory is not specified

            try:
                if log_file_name:
                    
                    if not Path(log_file_name).exists():
                        
                        # Create the log file if it doesn't exist
                        with open(log_file_name, 'w', encoding='utf-8') as f:
                            
                            f.write("Starting \n")  # Initial message or setup operation
                            # Add a starting message if loggers are combined
                            if combine_loggers:
                                
                                self.log('info', 'Starting')

                    # Open or create the log file based on whether loggers should combine their logs
                    if combine_loggers:
                        
                        if log_file_name not in Logger.__open_loggers:
                            
                            self.__log_file = open(log_file_name, 'a', encoding='utf-8')
                            
                            Logger.__open_loggers[log_file_name] = self.__log_file
                        else:
                            
                            self.__log_file = Logger.__open_loggers[log_file_name]
                    else:
                        
                        self.__log_file = open(log_file_name, 'a', encoding='utf-8')
                        
                        Logger.__open_loggers[log_file_name] = self.__log_file
                        
                        if not combine_loggers:
                            
                            self.log('info', 'Starting')

            except Exception as e:
                raise Exception(f"Error while creating log file: {e}")

    def get_log_name(self):
        
        if self.has_plugin(self.used_plugins, 'GetLogFileName'):
            
            if self.plugins:
                
                plugin = next((plugin for plugin in self.plugins if hasattr(plugin, 'GetLogFileName')), None)
                
                if plugin and hasattr(plugin, 'GetLogFileName') and isinstance(plugin, GetLogFileName):
                    
                    return plugin.func()
        else:
            
            if self.file_path:
                
                return str(self.file_path.resolve() / f"{self.timestamp}.{self.__log_file_type}")
            raise Errors.PathNonExistent('File path not found')



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
                
                if self.has_plugin(self.used_plugins, 'LoadJson'):
                    
                    if self.plugins:
                        
                        plugin = next((plugin for plugin in self.plugins if hasattr(plugin, 'LoadJson')), None)
                        
                        if plugin and hasattr(plugin, 'LoadJson') and isinstance(plugin, LoadJson):
                            
                            return plugin.func()
                if Path(path).resolve():
                    
                    with open(path, 'r',encoding="utf-8") as f:
                        
                        self.__settings = json.load(f)
                else:
                    
                    raise Errors.PathNonExistent('File path does not exist')
        else:
            
            raise Errors.LockNonExistent('Thread lock does not exist, please contact dev')

    def load_plugins(self) -> List[PluginType]:
        
        plugins: List[Plugin] = []
        
        if self.plugin_path:
            
            files = Path(self.plugin_path).iterdir()
            
            for file in files:
                
                if file.suffix == '.py':
                    
                    plugin_module = __import__(file.stem)
                    if plugin_module and hasattr(plugin_module, '__call__') and hasattr(plugin_module, 'execute'):
                        
                        plugin_instance = plugin_module()
                        plugins.append(plugin_instance)
                        if isinstance(self.used_plugins, list):
                            self.used_plugins.append(plugin_instance)
                        else:
                            self.used_plugins = [plugin_instance]
                    else:
                        raise Errors.PluginLoadingError(f"Unable to load plugin {file}")
        return plugins or []  # Handle the case where plugins is None
    
    @staticmethod
    def has_plugin(plugins: Union[PluginType, list[PluginType]], method_name: str) -> bool:

        if isinstance(plugins, list):
            
            return any(method_name in plugin.__dict__ for plugin in plugins)
        
        return method_name in plugins.__dict__
        
    def close(self):
        """
        Close the current log file.

        Raises:
            FileNotOpen: If file is not open.
            LockNonExistent: If the script doesn't have a lock.
        """
        if self.__log_file:
            
            if self.has_plugin(self.plugins, 'Close'):
                
                plugin = next((plugin for plugin in self.plugins if hasattr(plugin, 'Close')), None)
                
                if plugin and hasattr(plugin, 'Close') and isinstance(plugin, Close):
                    
                    return plugin.func(self.__log_file)
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
                    raise Errors.LockNonExistent('Threading lock is None or False for some reason')
        raise Errors.FileNotOpen("Log file is not open")
