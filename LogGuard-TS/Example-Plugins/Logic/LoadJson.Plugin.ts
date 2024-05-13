import { LoadJson } from "../../Types";
import * as fs from 'fs'

class PathNonExistant extends Error{}

export class Loadjson implements LoadJson{
    func(path: string){
        if (fs.existsSync(path)){
            const file = fs.readFileSync(path,'utf8')
            return JSON.parse(file)
        } else{
            throw new PathNonExistant('Invalid Path')
        }
    };
    params: [path: string];
    returnType: {};
    execute(
        path: string
    ){
        this.func(path)
    }
}// E.O.F.