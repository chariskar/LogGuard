# Usage

  import * as Logger from './Logger' or import * as Logger from 'Logger' if it is installed as a module
  
  const logger = new Logger.Logger()

  logger.log('info','hello')

# Plugins
  When calling the Logger point to a valid folder that contains the plugin files and then update the UsedPlugins variable to contain all the plugins you will be using

# Contribute

  If you want to contribute to the codebase your code must fit the code style.

  If you are contributing to the JavaScript or Typescript Loggers make sure to use the ready .eslintrc.json file for code styling.

  If you contribute to python run pylint logger.py the score must always be above 8 anything else will be rejected.

# Instalation

  I decided to not put the code on any package manager (they did not want to work for some reason) so to install them you just grab the files you want for example the logger file and the log_settings.json file or the styling files if you like

