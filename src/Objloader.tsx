export const loadObj = (gl: WebGL2RenderingContext, objFileContent: string, mtlFileContent: string) => {
  
    const splitFileContent = objFileContent.split('\n');

    const dataPerVertex = 3;
    const dataPerVertexNormal = 3;
    const dataPerTexCoord = 2;
    const dataPerFaceIndex = 9;

    let vertexCount = 0;
    let vertexNormalCount = 0;
    let texCoordCount = 0;
    let faceIndicesCount = 0;
    let materialCount = 0;

    for (const line of splitFileContent) {
        switch (line[0]) {
            case 'v': 
                vertexCount += 1;
                break;
            case 'vn': 
                vertexNormalCount += 1;
                break;
            case 'vt': 
                texCoordCount += 1;
                break;
            case 'f': 
                faceIndicesCount += 1;
                break;
            case 'usemtl':
                materialCount += 1;
                break;
        }
    }

    const vertexPositions: Array<number> = new Array(dataPerVertex       * vertexCount);
    const vertexNormals:   Array<number> = new Array(dataPerVertexNormal * vertexNormalCount);
    const texCoords:       Array<number> = new Array(dataPerTexCoord     * texCoordCount);
    const faceIndices:     Array<number> = new Array(dataPerFaceIndex    * faceIndicesCount);

    vertexCount = 0;
    vertexNormalCount = 0;
    texCoordCount = 0;
    faceIndicesCount = 0;
    
    for (const line of splitFileContent) {
        const lineSplit = line.split(' ');
        switch (line[0]) {
            case 'v': {
                for (let i = 0; i < dataPerVertex; i++) 
                    vertexPositions[vertexCount + i] = parseFloat(lineSplit[i + 1]);
                vertexCount += dataPerVertex;
                break;
            }
            case 'vn': {
                for (let i = 0; i < dataPerVertexNormal; i++) 
                    vertexNormals[vertexNormalCount + i] = parseFloat(lineSplit[i + 1]);
                vertexNormalCount += dataPerVertexNormal;
                break;
            }
            case 'vt': {
                for (let i = 0; i < dataPerTexCoord; i++) 
                    texCoords[texCoordCount + i] = parseFloat(lineSplit[i + 1]);
                texCoordCount += dataPerTexCoord;
                break;
            }
            case 'f': {
                for (let i = 0; i < 3; i++) 
                {
                    const faceSplit = lineSplit[i + 1].split('/');
                    for (let j = 0; j < 3; j++) 
                        faceIndices[faceIndicesCount + i * 3 + j] = parseInt(faceSplit[j]);
                }
                faceIndicesCount += dataPerFaceIndex;
                break;
            }
        }
    }

    const cantor = (a: number, b: number) => {
        return (a + b + 1) * (a + b) / 2 + b;
    }
     
    const hash = (a: number, b: number, c: number) => {
        return cantor(a, cantor(b, c));
    }

    const correctedIndexBuffer: Record<number, number> = { };
    const indexBuffer = new Array<number>();
    const vertexBuffer = new Array<number>();
    let count = 0;

    for (let i = 0; i < faceIndices.length; i += 3) {
        const hashVal = hash(faceIndices[i],
                             faceIndices[i + 1],
                             faceIndices[i + 2]);

        if (hashVal in correctedIndexBuffer)
        {
            indexBuffer.push(correctedIndexBuffer[hashVal]);
        }
        else
        {
            console.log("" + i + " " + faceIndices[i])
            const vertexPosIndex = faceIndices[i] - 1;
            vertexBuffer.push(vertexPositions[vertexPosIndex * dataPerVertex],
                              vertexPositions[vertexPosIndex * dataPerVertex + 1],
                              vertexPositions[vertexPosIndex * dataPerVertex + 2])

            const texCoordIndex = faceIndices[i + 1] - 1;
            vertexBuffer.push(vertexPositions[texCoordIndex * dataPerTexCoord],
                              vertexPositions[texCoordIndex * dataPerTexCoord + 1])

            const vertexNormalIndex = faceIndices[i + 2] - 1;
            vertexBuffer.push(vertexPositions[vertexNormalIndex * dataPerVertexNormal],
                              vertexPositions[vertexNormalIndex * dataPerVertexNormal + 1],
                              vertexPositions[vertexNormalIndex * dataPerVertexNormal + 2])

            correctedIndexBuffer[hashVal] = count;
            indexBuffer.push(count);
            count += 1;
        }
    }

    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);

    const vbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertexBuffer), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 8 * 4, 0);
    gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 8 * 4, 3 * 4);
    gl.enableVertexAttribArray(2);
    gl.vertexAttribPointer(2, 2, gl.FLOAT, false, 8 * 4, 6 * 4);

    const ibo = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint32Array(indexBuffer), gl.STATIC_DRAW);

    return {
        vbo: vao, 
        iboLength: indexBuffer.length
    }
}