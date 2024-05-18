import { LogFileName } from "../../../Types";
import * as Path from 'path'
export default class GetName implements LogFileName{
    params: [path: string,type: string];
    returnType: string;
    func(path: string,type: string): string{
        return Path.resolve(path, `Index.${type}`) // return the filepath and the name of the file
    }
    execute(path: string,type: string): string{
        return this.func(path,type)
    }

    
} // E.O.F.