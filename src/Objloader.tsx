const loadObj = (fileContent: string) => {
    vertexPosArray: Array<number>;
    vertexNormalArray: Array<number>;
    FaceIDs: Array<number>;

    fileContent.split('\n').forEach(
        line => { 
            switch(line.split(' ')[0]){
                case 'v': {
                    vertexPosArray.push(+line.split(' ')[1]);
                    break;
                }
            } 
        }
    )
}