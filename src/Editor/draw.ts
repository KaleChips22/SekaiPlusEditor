const draw = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
  ctx.clearRect(0, 0, width, height)

  ctx.fillStyle = '#0007'
  ctx.fillRect(0, 0, width, height)
}

export default draw
