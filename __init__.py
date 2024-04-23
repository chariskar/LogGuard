from LogGuard import LogGuard

class Logger:
    def __init__(self,
                 output_directory: str = "logs",
                 log_file_type: str = "log",
                 settings_path: str = './log_settings.json',
                 log_level: str = 'INFO'):
        self.Logger = LogGuard(
            output_dir=output_directory,
            log_file_type=log_file_type,
            settings_path=settings_path,
            log_level=log_level
        )
        return self.Logger