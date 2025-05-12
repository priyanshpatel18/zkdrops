import { DeviceInfo } from '@/types/types'
import FingerprintJS from '@fingerprintjs/fingerprintjs'
import { QRSession } from '@prisma/client'
import { PublicKey } from '@solana/web3.js'
import crypto from 'crypto'
import { Dispatch, SetStateAction } from 'react'
import { groth16 } from 'snarkjs'

export async function generateProof(session: QRSession, deviceInfo: DeviceInfo, publicKey: PublicKey | null) {
  if (!publicKey) {
    throw new Error('Wallet not connected')
  }
  if (!session) {
    throw new Error('Session not found')
  }
  if (!deviceInfo) {
    throw new Error('Device info not found')
  }

  const sessionIdHash = crypto.createHash('sha256').update(session.id).digest('hex')

  // Prepare inputs for ZK circuit
  const circuitInputs = {
    nonce: BigInt('0x' + Buffer.from(session.nonce).toString('hex')),
    deviceHash: BigInt('0x' + Buffer.from(deviceInfo.fingerprint).toString('hex')),
    sessionId: BigInt('0x' + Buffer.from(sessionIdHash).toString('hex')),
    walletAddressHash: publicKey.toBase58()
      ? BigInt('0x' + Buffer.from(publicKey.toBase58()).toString('hex'))
      : BigInt(0),
  }

  // In a real implementation, you would load your circuit files
  const { proof, publicSignals } = await groth16.fullProve(
    circuitInputs,
    '/circuits/claim_circuit.wasm',
    '/circuits/claim_circuit_final.zkey',
  )

  return {
    proof,
    publicSignals,
  }
}

export async function getDeviceInfo(session: QRSession, setDeviceInfo: Dispatch<SetStateAction<DeviceInfo | null>>) {
  // Get device fingerprint
  const fpPromise = FingerprintJS.load()
  const fp = await fpPromise
  const result = await fp.get()
  const deviceFingerprint = result.visitorId

  // Request geolocation permissions
  let geoPosition = null

  try {
    if (navigator.geolocation) {
      geoPosition = await new Promise((resolve) => {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            resolve({
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              accuracy: position.coords.accuracy,
            })
          },
          (error) => {
            console.warn('Geolocation error:', error)
            resolve(null)
          },
          { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
        )
      })
    }
  } catch (geoErr) {
    console.warn('Geolocation failed:', geoErr)
  }

  // Collect user agent
  const userAgent = navigator.userAgent

  const info: DeviceInfo = {
    fingerprint: deviceFingerprint,
    geolocation: geoPosition as DeviceInfo['geolocation'],
    userAgent,
  }

  setDeviceInfo(info)

  // Check if this device has already claimed
  const res = await fetch(
    `/api/check-device?fingerprint=${encodeURIComponent(deviceFingerprint)}&campaignId=${encodeURIComponent(session?.campaignId || '')}`,
  )
  const data = await res.json()

  if (data.hasClaimed) {
    throw new Error('This device has already claimed an NFT from this campaign')
  }

  return info
}
