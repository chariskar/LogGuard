from logger import Logger
import json

# Instantiate the logger
logger = Logger()

# Load log levels from settings file
with open('./log_settings.json','r') as r:
    levels = json.load(r)

# Log messages with each level
for level in levels['LogLevels']:
    logger.log(str(level),'hi')
    
# Close the logger
logger.close() 
