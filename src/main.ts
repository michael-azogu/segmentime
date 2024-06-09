import './style.css'
import type { Dir, Pos } from './utils'
import { Car, Node, off, opposite, shuffle } from './utils'

const h1: Pos[] = [
  [0.5, 0],
  [1, 0.5],
  [0.5, 1],
  [0, 1.5],
  [0.5, 2],
  [1, 1.5],
  [0, 0.5],
]
const h0 = tx(h1, 2)
const m1 = tx(h0, 2)
const m0 = tx(m1, 2)
const seg_positions = [h1, h0, m1, m0].flat()

const digit_to_seg: { [key: number]: number[] } = {
  /**
   *  0 0 0
   * 6     1
   * 6     1
   * 6     1
   *  2 2 2
   * 3     5
   * 3     5
   * 3     5
   *  4 4 4
   *
   */

  0: [0, 1, 5, 4, 3, 6],
  1: [1, 5],
  2: [0, 1, 2, 3, 4],
  3: [0, 1, 2, 5, 4],
  4: [6, 2, 1, 5],
  5: [0, 6, 2, 5, 4],
  6: [0, 6, 3, 4, 5, 2],
  7: [0, 1, 5],
  8: [0, 1, 2, 3, 4, 5, 6],
  9: [1, 0, 6, 2, 5],
}

const ROWS = 3
const COLS = 7
const STEPS = ROWS * COLS

const half_length = 50
const LENGTH = half_length * 2

const half_thickness = 15
const THICKNESS = half_thickness * 2

const canvas = document.createElement('canvas')
document.querySelector<HTMLDivElement>('#app')!.append(canvas)
canvas.height = ROWS * LENGTH + 2 * LENGTH
canvas.width = COLS * LENGTH + 2 * LENGTH

const snap_image = document.getElementById('snap')! as HTMLImageElement
snap_image.width = canvas.width / 3
snap_image.height = canvas.height / 3

const ctx = canvas.getContext('2d')!
const blank = ctx.createImageData(canvas.width, canvas.height)

ctx.fillStyle = '#ccc'
ctx.translate(LENGTH, LENGTH)
ctx.fillRect(-LENGTH, -LENGTH, canvas.width + LENGTH, canvas.height + LENGTH)

colon: {
  ctx.beginPath()
  ctx.arc((COLS / 2) * LENGTH, (ROWS / 6) * LENGTH, 8, 0, 2 * Math.PI)
  ctx.fillStyle = '#444'
  ctx.fill()
  ctx.stroke()
  ctx.closePath()
  ctx.beginPath()
  ctx.arc((COLS / 2) * LENGTH, (ROWS / 2) * LENGTH, 8, 0, 2 * Math.PI)
  ctx.fillStyle = '#444'
  ctx.fill()
  ctx.stroke()
  ctx.closePath()
}

const cars_layer = document.createElement('canvas')
cars_layer.width = canvas.width
cars_layer.height = canvas.height
const cars_ctx = cars_layer.getContext('2d')!

const layers: HTMLCanvasElement[] = [canvas, cars_layer]

const graph = create_graph()

const segmentNodes = graph.filter((n) => n.segmentID > -1)

const cars = shuffle(graph.filter((n) => n.isMidway))
  .slice(26)
  .map(({ x, y }) => new Car(x, y))

const loaded = load_queues(cars)

// ! TOO SLOW
function load_queues(cars: Car[]) {
  snap_image.src = canvas.toDataURL('image/png')

  const targets = shuffle(get_target_nodes(get_time()))

  const onamission = cars.slice(0, targets.length).map((c, i) => {
    const _ = c.clone()
    _.onmission = true
    _.pathQueue = find_path(
      graph.find((n) => n.x == c.x && n.y == c.y)!,
      targets[i]
    )
    return _
  })

  const jobless = cars.slice(targets.length).map((c) => {
    const _ = c.clone()
    _.onmission = false
    _.pathQueue = random_path(graph.find((n) => n.x == c.x && n.y == c.y)!)
    return _
  })

  return [...jobless, ...onamission]
}

function cars_update(cars: Car[]) {
  const swastika = (dir: Dir, w: number, h: number) => {
    // ? u=l d=r r=u l=d
    let dx = 0
    let dy = 0
    switch (dir) {
      case 'N':
        dx -= w / 4
        break
      case 'S':
        dx += w / 4
        break
      case 'E':
        dy -= h / 4
        break
      case 'W':
        dy += h / 4
        break
    }
    return { dx, dy }
  }

  // before or after painting ?
  cars.forEach((c) => c.update())

  cars.forEach(({ x, y, onmission }) => {
    redraw_layer(cars_ctx, (ctx) => {
      let w = 0.6 * (LENGTH - THICKNESS)
      let h = THICKNESS / 2

      // compute V or H
      if (true) {
        let tmp = w
        w = h
        h = tmp
      }

      let cx = x + w / 2
      let dx = x - cx

      let cy = y + h / 2
      let dy = y - cy

      ctx.beginPath()
      ctx.rect(x + dx, y + dy, w, h)
      ctx.fillStyle = onmission ? '#26f' : '#f62'
      ctx.fill()
      ctx.closePath()
    })
  })
}

function create_graph() {
  const nodes: Node[] = []

  for (let cux = 0; cux <= COLS; cux++) {
    for (let cuy = 0; cuy <= ROWS; cuy++) {
      let node: Node

      const crx = cux * LENGTH
      const cry = cuy * LENGTH

      if (!nodes.some((n) => n.x == crx && n.y == cry)) {
        node = new Node(crx, cry)
        nodes.push(node)
      } else {
        node = nodes.find((n) => n.x == crx && n.y == cry)!
      }

      const neighbors: [Node, Dir][] = []
      Object.entries(off).forEach(([dir, { dx, dy }]) => {
        const nux = cux + dx
        const nuy = cuy + dy
        const nrx = nux * LENGTH
        const nry = nuy * LENGTH

        const hux = cux + dx / 2
        const huy = cuy + dy / 2
        const hrx = hux * LENGTH
        const hry = huy * LENGTH

        if (nux < 0 || nuy < 0 || nux > COLS || nuy > ROWS) {
          return
        }

        let neighbor = new Node(
          hrx,
          hry,
          true,
          seg_positions.findIndex((pos) => pos[0] == hux && pos[1] == huy)
        )

        if (!nodes.some((n) => n.x == hrx && n.y == hry)) {
          nodes.push(neighbor)
          neighbors.push([neighbor, dir as Dir])
        } else {
          neighbors.push([
            nodes.find((n) => n.x == hrx && n.y == hry)!,
            dir as Dir,
          ])
        }

        neighbor.add(node, opposite[dir as Dir])

        let next = new Node(nrx, nry)
        if (!nodes.some((n) => n.x == nrx && n.y == nry)) {
          nodes.push(next)
        } else {
          next = nodes.find((n) => n.x == nrx && n.y == nry)!
        }
        neighbor.add(next, dir as Dir)

        drawRoad([crx, cry], [hrx, nry])
        drawRoad([hrx, hry], [nrx, nry])

        function drawRoad(
          [x1, y1]: [number, number],
          [x2, y2]: [number, number]
        ) {
          const { rx, ry, rh, rw } = (() => {
            switch (dir) {
              case 'N':
              case 'S':
                return {
                  rx: x1 - half_thickness,
                  ry: y1,
                  rw: THICKNESS,
                  rh: y2 - y1,
                }
              case 'W':
              case 'E':
                return {
                  rx: x1,
                  ry: y1 - half_thickness,
                  rw: x2 - x1,
                  rh: THICKNESS,
                }
            }
          })()!

          ctx.beginPath()
          ctx.fillStyle = '#fff'
          ctx.fillRect(rx, ry, rw, rh)
          ctx.closePath()
        }
      })
      neighbors.forEach(([n, d]) => node.add(n, d))
    }
  }

  return nodes
}

function seg_ids_for_time(time: string) {
  return [...time].reduce(
    (ids, digit, i) => [
      ...ids,
      ...digit_to_seg[+digit].map((id) => id + 7 * i),
    ],
    [] as number[]
  )
}

function get_target_nodes(time: string) {
  return seg_ids_for_time(time).map(
    (id) => segmentNodes.find((n) => n.segmentID == id)!
  )
}

function redraw_layer(
  ctx: CanvasRenderingContext2D,
  cb: (ctx: CanvasRenderingContext2D) => void
) {
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  ctx.putImageData(blank, canvas.width, canvas.height)
  cb(ctx)
  compose()
}

function compose() {
  ctx.clearRect(-LENGTH, -LENGTH, canvas.width + LENGTH, canvas.height + LENGTH)
  layers.forEach((layer) => ctx.drawImage(layer, 0, 0))
}

function unit_quantize(ptA: [number, number], ptB: [number, number]) {
  const [x1, y1] = ptA
  const [x2, y2] = ptB
  const dx = x2 - x1
  const dy = y2 - y1
  const unitDx = dx === 0 ? 0 : dx > 0 ? 1 : -1
  const unitDy = dy === 0 ? 0 : dy > 0 ? 1 : -1
  return [unitDx, unitDy]
}

function find_path(
  from: Node,
  to: Node,
  steps: number = STEPS,
  path: Node[] = []
): Node[] {
  if (steps == 0) {
    return from == to ? [...path, to] : []
  } else {
    for (const edge of shuffle(Object.values(from.edges))) {
      if (edge == null) continue
      const p = find_path(edge, to, steps - 1, [...path, from])
      if (p.length > 0) return p.slice(1)
    }
  }
  return []
}

function random_path(
  node: Node,
  steps: number = STEPS,
  path: Node[] = []
): Node[] {
  path.push(node)
  if (path.length === steps) {
    return path.slice(1)
  }
  for (const neighbor of shuffle(
    Object.values(node.edges).filter((n) => n != null)
  )) {
    const result = random_path(neighbor!, steps, path)
    if (result) return result
  }
  path.pop()
  return []
}

function get_time() {
  return new Date()
    .toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })
    .replace(/[^0-9]/g, '')
}

function tx(segs: Pos[], by: number) {
  return segs.map(([x, y]) => [x + by, y] as Pos)
}

function ty(segs: Pos[], by: number) {
  return segs.map(([x, y]) => [x, y + by] as Pos)
}
