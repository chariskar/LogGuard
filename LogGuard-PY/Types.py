from typing import Callable, Union, Tuple, Any,Dict
from io import TextIOWrapper
# Define PluginType as a union of the available plugin types
PluginType = Union['Formatter', 'Log', 'GetLogFileName' , 'CreateLogFile', 'Close', 'LoadJson', Any]


# Define Plugin as a base interface for all plugins
class Plugin:
    def execute(self, *args: Any):
        pass

class Formatter(Plugin):
    func: Callable[..., Any]  # Define formatter attribute
    params: Tuple[str, str, str,Dict, None]
    returnType: str

class Log(Plugin):
    func: Callable[..., Any]
    params: Tuple[ Dict[str, Dict[str, int]],str, str, None]
    returnType: None

class CreateLogFile(Plugin):
    func: Callable[..., Any]
    params: Tuple[str,bool,bool]
    returnType: None

class Close(Plugin):
    func: Callable[..., Any]
    params: Tuple[()]
    returnType: None

class LoadJson(Plugin):
    func: Callable[..., Any]
    params: Tuple[str]
    returnType: None
    
class GetLogFileName(Plugin):
    func: Callable[..., Any]
    params: Tuple[TextIOWrapper]
    returnType: str