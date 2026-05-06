// Run: node generate-icons.mjs
// Generates simple golf-themed SVG icons at 192 and 512 sizes as PNG via canvas

import { createCanvas } from 'canvas'
import { writeFileSync } from 'fs'
import { mkdirSync } from 'fs'

mkdirSync('public/icons', { recursive: true })

function drawIcon(size) {
  const canvas = createCanvas(size, size)
  const ctx = canvas.getContext('2d')
  const pad = size * 0.08

  // Background
  ctx.fillStyle = '#1a2e1a'
  ctx.beginPath()
  ctx.roundRect(0, 0, size, size, size * 0.22)
  ctx.fill()

  // Fairway circle
  ctx.fillStyle = '#2d4a2d'
  ctx.beginPath()
  ctx.arc(size / 2, size / 2, size * 0.38, 0, Math.PI * 2)
  ctx.fill()

  // Flag pole
  ctx.strokeStyle = '#c8a96e'
  ctx.lineWidth = size * 0.04
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(size / 2, size * 0.28)
  ctx.lineTo(size / 2, size * 0.72)
  ctx.stroke()

  // Flag
  ctx.fillStyle = '#c8a96e'
  ctx.beginPath()
  ctx.moveTo(size / 2, size * 0.28)
  ctx.lineTo(size * 0.68, size * 0.38)
  ctx.lineTo(size / 2, size * 0.48)
  ctx.closePath()
  ctx.fill()

  // Golf ball
  ctx.fillStyle = '#e8e4d9'
  ctx.beginPath()
  ctx.arc(size * 0.35, size * 0.64, size * 0.09, 0, Math.PI * 2)
  ctx.fill()

  return canvas.toBuffer('image/png')
}

try {
  writeFileSync('public/icons/icon-192.png', drawIcon(192))
  console.log('Generated icon-192.png')
  writeFileSync('public/icons/icon-512.png', drawIcon(512))
  console.log('Generated icon-512.png')
} catch (e) {
  console.log('canvas package not available — using placeholder icons')
  // Create minimal 1x1 PNG as fallback
  const placeholder = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64')
  writeFileSync('public/icons/icon-192.png', placeholder)
  writeFileSync('public/icons/icon-512.png', placeholder)
}
