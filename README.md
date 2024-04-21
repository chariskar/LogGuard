# Logger 

All loggers have the exact same usage for example.

# Python

  from logger import * as Logger
  
  logger = Logger()
  logger.log('info','Hello')

# JavaScript

  import * as Logger from './Logger' or import * as Logger from 'Logger' if it is installed as a module
  
  const logger = new Logger.Logger()
  logger.log('info','hello')

# TypeScript

  import * as Logger from './Logger' or import * as Logger from 'Logger' if it is installed as a module
  
  const logger = new Logger.Logger()
  logger.log('info','hello')

# Contribute

If you want to contribute to the codebase your code must fit the code style.

If you are contributing to the JavaScript or Typescript Loggers make sure to use the ready .eslintrc.json file for code styling.

If you contribute to python run pylint logger.py the score must always be above 8 anything else will be rejected.
