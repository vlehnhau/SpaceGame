export interface Material {
  shininess?: number;
  ambient?: number[];
  diffuse?: number[];
  specular?: number[];
  emissive?: number[];
  opticalDensity?: number;
  opacity?: number;
  illum?: number;
  transparency?: number;
  transmissionFilter?: number[];
  roughness?: number;
  metalness?: number;
  sheen?: number;
  dispersion?: number;
}

export interface VaoMaterialInfo {
  vao: WebGLVertexArrayObject;
  iboLength: number;
  material: Material;
}

export interface exportObjLoader {
  vaoInfos: VaoMaterialInfo[];
  vertexPositions: number[];
}

export const loadObj = (gl: WebGL2RenderingContext, objFileContent: string, mtlFileContent: string): exportObjLoader => {
  const materials = parseMTL(mtlFileContent);
  let currentMaterial: string | null = null;

  const modelData: {
    [materialName: string]: {
      vertices: number[],
      normals: number[],
      texCoords: number[],
      indices: number[]
    }
  } = {};

  const vertexPositions: number[] = [];
  const vertexNormals: number[] = [];
  const texCoords: number[] = [];
  const tempFaces: Array<[number, number, number]> = [];

  const splitFileContent = objFileContent.split('\n');
  for (const line of splitFileContent) {
    const lineSplit = line.split(' ');
    switch (lineSplit[0]) {
      case 'usemtl':
        currentMaterial = lineSplit[1];
        if (!modelData[currentMaterial]) {
          modelData[currentMaterial] = { vertices: [], normals: [], texCoords: [], indices: [] };
        }
        break;
      case 'v':
        vertexPositions.push(...lineSplit.slice(1).map(parseFloat));
        break;
      case 'vn':
        vertexNormals.push(...lineSplit.slice(1).map(parseFloat));
        break;
      case 'vt':
        texCoords.push(...lineSplit.slice(1).map(parseFloat));
        break;
      case 'f':
        for (let i = 1; i <= 3; i++) {
          const [v, vt, vn] = lineSplit[i].split('/').map(x => parseInt(x) - 1);
          tempFaces.push([v, vt, vn]);
          if (currentMaterial) {
            modelData[currentMaterial].indices.push(tempFaces.length - 1);
          }
        }
        break;
    }

  }

  Object.keys(modelData).forEach(material => {
    const materialData = modelData[material];
    materialData.indices.forEach(index => {
      const [v, vt, vn] = tempFaces[index];
      materialData.vertices.push(vertexPositions[3 * v], vertexPositions[3 * v + 1], vertexPositions[3 * v + 2]);
      materialData.texCoords.push(texCoords[2 * vt], texCoords[2 * vt + 1]);
      materialData.normals.push(vertexNormals[3 * vn], vertexNormals[3 * vn + 1], vertexNormals[3 * vn + 2]);
    });
  });

  const vaoInfos: VaoMaterialInfo[] = [];

  Object.keys(modelData).forEach(material => {
    const materialData = modelData[material];
    const vao = createVAO(gl, materialData.vertices, materialData.normals, materialData.texCoords, materialData.indices);
    vaoInfos.push({ vao, iboLength: materialData.indices.length, material: materials[material] });
  });

  return { vaoInfos, vertexPositions };
}

function createVAO(gl: WebGL2RenderingContext, vertices: number[], normals: number[], texCoords: number[], indices: number[]): WebGLVertexArrayObject {
  const vao = gl.createVertexArray();
  gl.bindVertexArray(vao);

  const vertexArray = new Array<number>(vertices.length + normals.length + texCoords.length);

  for (let index = 0; index < (vertexArray.length) / 8; index++) {
    vertexArray[index * 8] = vertices[index * 3];
    vertexArray[index * 8 + 1] = vertices[index * 3 + 1];
    vertexArray[index * 8 + 2] = vertices[index * 3 + 2];

    vertexArray[index * 8 + 3] = normals[index * 3];
    vertexArray[index * 8 + 4] = normals[index * 3 + 1];
    vertexArray[index * 8 + 5] = normals[index * 3 + 2];

    vertexArray[index * 8 + 6] = texCoords[index * 2];
    vertexArray[index * 8 + 7] = texCoords[index * 2 + 1];
  }

  // Vertex buffer
  const vertexBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertexArray), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 8 * 4, 0);

  // Texture coordinate buffer
  gl.enableVertexAttribArray(1);
  gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 8 * 4, 3 * 4);

  // Normal buffer
  gl.enableVertexAttribArray(2);
  gl.vertexAttribPointer(2, 3, gl.FLOAT, false, 8 * 4, 5 * 4);

  // Index buffer
  const indexBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint32Array(indices), gl.STATIC_DRAW);

  return vao;
}


function parseMTL(text) {
  const materials = {};
  let material;

  const keywords = {
    newmtl(parts, unparsedArgs) {
      material = {};
      materials[unparsedArgs] = material;
    },

    Ns(parts) { material.shininess = parts.map(parseFloat); },
    Ka(parts) { material.ambient = parts.map(parseFloat); },
    Kd(parts) { material.diffuse = parts.map(parseFloat); },
    Ks(parts) { material.specular = parts.map(parseFloat); },
    Ke(parts) { material.emissive = parts.map(parseFloat); },
    Ni(parts) { material.opticalDensity = parseFloat(parts[0]); },
    d(parts) { material.opacity = parseFloat(parts[0]); },
    illum(parts) { material.illum = parseInt(parts[0]); },
    Tr(parts) { material.transparency = parseFloat(parts[0]); },
    Tf(parts) { material.transmissionFilter = parts.map(parseFloat); },
    Pr(parts) { material.roughness = parseFloat(parts[0]); },
    Pm(parts) { material.metalness = parseFloat(parts[0]); },
    Pl(parts) { material.sheen = parseFloat(parts[0]); },
    Pds(parts) { material.dispersion = parseFloat(parts[0]); },
  };

  const keywordRE = /(\w*)(?: )*(.*)/;
  const lines = text.split('\n');
  for (let lineNo = 0; lineNo < lines.length; ++lineNo) {
    const line = lines[lineNo].trim();
    if (line === '' || line.startsWith('#')) {
      continue;
    }
    const m = keywordRE.exec(line);
    if (!m) {
      continue;
    }
    const [, keyword, unparsedArgs] = m;
    const parts = line.split(/\s+/).slice(1);
    const handler = keywords[keyword];
    if (!handler) {
      console.warn('unhandled keyword:', keyword);
      continue;
    }
    handler(parts, unparsedArgs);
  }

  return materials;
}