export type Pos = [number, number]
export type Dir = 'N' | 'E' | 'S' | 'W'

export class Node {
  x: number
  y: number
  segmentID: number
  isMidway: boolean
  edges: { [key in Dir]: Node | null }

  constructor(x: number, y: number, isMidway = false, segmentID: number = -1) {
    this.x = x
    this.y = y
    this.edges = {
      N: null,
      E: null,
      S: null,
      W: null,
    }
    this.isMidway = isMidway
    this.segmentID = segmentID
  }

  add(node: Node, dir: Dir) {
    this.edges[dir] = node
  }
}

export class Car {
  x: number
  y: number
  dx: number = 2
  dy: number = 2
  orientation: '|' | '_'
  pathQueue: Node[]

  onmission: boolean
  last: Node | null
  next: Node | null

  constructor(x: number, y: number) {
    this.x = x
    this.y = y
    this.orientation = '_'
    this.pathQueue = []
    this.last = null
    this.next = null
    this.onmission = true
  }

  update() {
    this.x += this.dx
    this.y += this.dy
  }

  clone() {
    return Object.assign<Car, Car>(
      new Car(this.x, this.y),
      JSON.parse(JSON.stringify(this))
    )
  }
}

export function shuffle<T>(array: T[]) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[array[i], array[j]] = [array[j], array[i]]
  }
  return array
}

export const off: { readonly [key in Dir]: { dx: number; dy: number } } = {
  N: { dx: 0, dy: -1 },
  E: { dx: 1, dy: 0 },
  S: { dx: 0, dy: 1 },
  W: { dx: -1, dy: 0 },
}

export const opposite: { readonly [key in Dir]: Dir } = {
  N: 'S',
  E: 'W',
  S: 'N',
  W: 'E',
}
