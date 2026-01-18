import { useRef, useState, useMemo } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Stars } from '@react-three/drei'
import * as THREE from 'three'
import AgentChat from './AgentChat'
import { Brain, Zap, Activity } from 'lucide-react'

function NeuralNetwork({ activityLevel }) {
  const points = useMemo(() => {
    const p = []
    for (let i = 0; i < 200; i++) {
        const phi = Math.acos(-1 + (2 * i) / 200)
        const theta = Math.sqrt(200 * Math.PI) * phi
        p.push(new THREE.Vector3(
          4 * Math.cos(theta) * Math.sin(phi),
          4 * Math.sin(theta) * Math.sin(phi),
          4 * Math.cos(phi)
        ))
    }
    return p
  }, [])

  const group = useRef()

  useFrame((state) => {
    if (group.current) {
      group.current.rotation.y += 0.001 * activityLevel
      group.current.rotation.x += 0.0005 * activityLevel
    }
  })

  return (
    <group ref={group}>
      {points.map((point, i) => (
         <mesh key={i} position={point}>
            <sphereGeometry args={[0.05, 10, 10]} />
            <meshStandardMaterial color={new THREE.Color().setHSL(0.7, 1, 0.5)} emissive={new THREE.Color().setHSL(0.7, 1, 0.5)} emissiveIntensity={activityLevel * 0.2} />
         </mesh>
      ))}
      <Lines points={points} activityLevel={activityLevel} />
    </group>
  )
}

function Lines({ points, activityLevel }) {
  const ref = useRef()
  useFrame(() => {
    if (ref.current) {
        ref.current.material.opacity = 0.1 + (activityLevel * 0.05)
    }
  })

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry().setFromPoints(points)
    // Connect some random points for "neural" look
    const indices = []
    for(let i=0; i<points.length; i++) {
        for(let j=i+1; j<points.length; j++) {
            if (points[i].distanceTo(points[j]) < 1.5) {
                indices.push(i, j)
            }
        }
    }
    geo.setIndex(indices)
    return geo
  }, [points])

  return (
    <lineSegments geometry={geometry} ref={ref}>
        <lineBasicMaterial color="#a78bfa" transparent opacity={0.3} />
    </lineSegments>
  )
}

export default function NeuroLink({ agents, selectedAgent, setSelectedAgent }) {
  const [activity, setActivity] = useState(2)

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] space-y-4">
        {/* Top: 3D Visualization */}
        <div className="relative h-1/2 bg-black/40 rounded-xl border border-purple-500/30 overflow-hidden">
            <div className="absolute top-4 left-4 z-10 flex items-center space-x-4 bg-black/50 p-2 rounded-lg backdrop-blur-md border border-purple-500/20">
                <Brain className="w-6 h-6 text-purple-400" />
                <div>
                   <h2 className="text-sm font-bold text-white">Neural Globe</h2>
                   <div className="flex items-center space-x-2">
                      <Zap className="w-3 h-3 text-yellow-400" />
                      <input 
                        type="range" 
                        min="0" 
                        max="10" 
                        step="0.1" 
                        value={activity} 
                        onChange={(e) => setActivity(parseFloat(e.target.value))}
                        className="w-32 h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
                      />
                      <span className="text-xs text-gray-300 w-10">{activity.toFixed(1)}Hz</span>
                   </div>
                </div>
            </div>

            <Canvas camera={{ position: [0, 0, 12], fov: 45 }}>
                <ambientLight intensity={0.5} />
                <pointLight position={[10, 10, 10]} intensity={1} />
                <NeuralNetwork activityLevel={activity} />
                <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
                <OrbitControls enableZoom={false} autoRotate autoRotateSpeed={activity * 0.2} />
            </Canvas>
        </div>

        {/* Bottom: Chat Interface */}
        <div className="flex-1 min-h-0 bg-gray-900/50 rounded-xl border border-gray-800 flex flex-col p-4 relative overflow-hidden">
             {/* Decorative background element */}
             <div className="absolute pointer-events-none inset-0 bg-gradient-to-t from-purple-900/5 to-transparent" />
             
             <div className="flex items-center space-x-2 mb-2 z-10">
                <Activity className="w-4 h-4 text-green-400" />
                <h3 className="text-sm font-semibold text-gray-300">Synaptic Uplink</h3>
             </div>
             
             <div className="flex-1 overflow-hidden z-10">
                 <AgentChat 
                    agents={agents} 
                    selectedAgent={selectedAgent} 
                    setSelectedAgent={setSelectedAgent} 
                 />
             </div>
        </div>
    </div>
  )
}
