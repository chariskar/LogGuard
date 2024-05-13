import { Logger } from "./LogGuard-TS/LogGuard";


const logger = new Logger(
    './logs',
    'log',
    './LogGuard-TS/log_settings.json',
    'INFO',
    null,
    null,
    null
    
)
logger.log('info','Hello')
