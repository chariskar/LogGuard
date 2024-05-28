import type {StartupPlugin, LoggerInstance } from "../../Types"

export default class ExamplePlugin implements StartupPlugin{
    params: [instance: LoggerInstance]
    returnType: void
    func(
        instance: LoggerInstance
    ): void{
        // Example code you want to run during setup
    }
    execute(instance: LoggerInstance): void {
        this.func(instance)
    }
    
}