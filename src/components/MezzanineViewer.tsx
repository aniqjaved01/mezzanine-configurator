import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { useMemo } from 'react';
import type { MezzanineConfig } from '../types';

interface MezzanineViewerProps {
  config: MezzanineConfig;
}

export default function MezzanineViewer({ config }: MezzanineViewerProps) {
  return (
    <div className="w-full h-full bg-white rounded">
      <Canvas camera={{ position: [15, 10, 15], fov: 50 }}>
        <ambientLight intensity={0.7} />
        <directionalLight position={[10, 10, 5]} intensity={0.9} />
        <pointLight position={[-10, 10, -10]} intensity={0.4} />
        <MezzanineModel config={config} />
        <OrbitControls enablePan={true} enableZoom={true} enableRotate={true} />
        <gridHelper args={[50, 50, '#e5e5e5', '#f5f5f5']} />
      </Canvas>
    </div>
  );
}

// MezzanineModel component that renders the actual 3D structure
function MezzanineModel({ config }: { config: MezzanineConfig }) {
  // Convert mm to meters for Three.js (1 unit = 1 meter)
  const length = config.length / 1000;
  const width = config.width / 1000;
  const height = config.height / 1000;

  const stairs = useMemo(
    () => config.accessories.filter((a) => a.type === 'stairs'),
    [config.accessories]
  );
  const railings = useMemo(
    () => config.accessories.filter((a) => a.type === 'railings'),
    [config.accessories]
  );
  const palletGates = useMemo(
    () => config.accessories.filter((a) => a.type === 'palletGate'),
    [config.accessories]
  );

  return (
    <group>
      {/* Base frame/platform - light grey */}
      <mesh position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <boxGeometry args={[length, width, 0.1]} />
        <meshStandardMaterial color="#d3d3d3" />
      </mesh>

      {/* Support columns */}
      <SupportColumns length={length} width={width} height={height} />

      {/* Floor - light yellow */}
      <mesh position={[0, height, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <boxGeometry args={[length, width, 0.05]} />
        <meshStandardMaterial color="#fffacd" />
      </mesh>

      {/* Railings */}
      {railings.map((railing, idx) => {
        const segmentLength = railing.length || 10; // Length of each segment in meters
        // Calculate total stairs quantity from all stair accessories
        const totalStairsQuantity = stairs.reduce((sum, stair) => sum + stair.quantity, 0);
        // Calculate pallet gate ranges - each accessory positions its gates independently
        // Collect all gate positions from all accessories
        const palletGatesWidths: number[] = [];
        palletGates.forEach(gate => {
          const gateWidth = parseFloat(gate.width || '2000mm') / 1000;
          for (let q = 0; q < gate.quantity; q++) {
            palletGatesWidths.push(gateWidth);
          }
        });
        return (
          <Railings
            key={railing.id}
            length={length}
            width={width}
            height={height}
            quantity={railing.quantity}
            segmentLength={segmentLength}
            index={idx}
            stairsQuantity={totalStairsQuantity}
            palletGatesWidths={palletGatesWidths}
          />
        );
      })}

      {/* Stairs */}
      {stairs.map((stair, idx) => (
        <Stairs
          key={stair.id}
          length={length}
          width={width}
          height={height}
          index={idx}
          quantity={stair.quantity}
        />
      ))}

      {/* Pallet gates */}
      {(() => {
        // Calculate positions for all pallet gates together
        const allGateWidths = palletGates.flatMap(gate => 
          Array.from({ length: gate.quantity }, () => 
            parseFloat(gate.width || '2000mm') / 1000
          )
        );
        
        if (allGateWidths.length === 0) return null;
        
        // Calculate positions sequentially, centered as a group
        let currentX = 0;
        let totalSpan = 0;
        
        // Calculate total span needed
        allGateWidths.forEach((gateWidth, idx) => {
          if (idx > 0) {
            const prevWidth = allGateWidths[idx - 1];
            const spacing = Math.max(Math.max(prevWidth, gateWidth) + 1, 2);
            totalSpan += spacing;
          }
          totalSpan += gateWidth;
        });
        
        // Position gates starting from the left edge of the group
        currentX = -totalSpan / 2;
        const positions: Array<{ x: number; width: number }> = [];
        
        allGateWidths.forEach((gateWidth, idx) => {
          if (idx > 0) {
            const prevWidth = allGateWidths[idx - 1];
            const spacing = Math.max(Math.max(prevWidth, gateWidth) + 1, 2);
            currentX += spacing;
          }
          currentX += gateWidth / 2;
          positions.push({ x: currentX, width: gateWidth });
          currentX += gateWidth / 2;
        });
        
        return (
          <PalletGate
            key="all-pallet-gates"
            length={length}
            width={width}
            height={height}
            positions={positions}
          />
        );
      })()}
    </group>
  );
}

// Support columns component
function SupportColumns({
  length,
  width,
  height,
}: {
  length: number;
  width: number;
  height: number;
}) {
  const columnPositions: [number, number, number][] = [
    [-length / 2 + 0.5, height / 2, -width / 2 + 0.5],
    [length / 2 - 0.5, height / 2, -width / 2 + 0.5],
    [-length / 2 + 0.5, height / 2, width / 2 - 0.5],
    [length / 2 - 0.5, height / 2, width / 2 - 0.5],
  ];

  return (
    <>
      {columnPositions.map((pos, idx) => (
        <mesh key={idx} position={pos}>
          <cylinderGeometry args={[0.1, 0.1, height, 8]} />
          <meshStandardMaterial color="#d3d3d3" />
        </mesh>
      ))}
    </>
  );
}

// Railings component - creates continuous perimeter railings that wrap around corners
function Railings({
  length,
  width,
  height,
  quantity,
  segmentLength,
  index: _index,
  stairsQuantity,
  palletGatesWidths,
}: {
  length: number;
  width: number;
  height: number;
  quantity: number;
  segmentLength: number;
  index: number;
  stairsQuantity: number;
  palletGatesWidths: number[];
}) {
  const railingHeight = 1.1; // 1.1 meters
  const stairWidth = 1.0; // 1 meter wide (matches Stairs component)
  const postSpacing = 2.0; // meters between posts

  // Calculate total perimeter length
  const perimeter = 2 * (length + width);
  
  // Calculate total railing length needed
  const totalRailingLength = quantity * segmentLength;
  
  // If no railings needed, return nothing
  if (totalRailingLength <= 0) return null;

  // Calculate X-axis ranges occupied by stairs on the front edge
  const getStairsXRanges = (quantity: number): Array<[number, number]> => {
    if (quantity === 0) return [];
    const ranges: Array<[number, number]> = [];
    for (let qIdx = 0; qIdx < quantity; qIdx++) {
      const offsetX = (qIdx - (quantity - 1) / 2) * 2;
      ranges.push([offsetX - stairWidth / 2, offsetX + stairWidth / 2]);
    }
    return ranges;
  };

  // Calculate X-axis ranges occupied by pallet gates on the front edge
  const getPalletGatesXRanges = (widths: number[]): Array<[number, number]> => {
    if (widths.length === 0) return [];
    const ranges: Array<[number, number]> = [];
    let currentX = 0;
    let totalSpan = 0;
    
    widths.forEach((gateWidth, idx) => {
      if (idx > 0) {
        const prevWidth = widths[idx - 1];
        const spacing = Math.max(Math.max(prevWidth, gateWidth) + 1, 2);
        totalSpan += spacing;
      }
      totalSpan += gateWidth;
    });
    
    currentX = -totalSpan / 2;
    
    widths.forEach((gateWidth, idx) => {
      if (idx > 0) {
        const prevWidth = widths[idx - 1];
        const spacing = Math.max(Math.max(prevWidth, gateWidth) + 1, 2);
        currentX += spacing;
      }
      currentX += gateWidth / 2;
      ranges.push([currentX - gateWidth / 2, currentX + gateWidth / 2]);
      currentX += gateWidth / 2;
    });
    
    return ranges;
  };

  const stairsXRanges = getStairsXRanges(stairsQuantity);
  const palletGatesXRanges = getPalletGatesXRanges(palletGatesWidths);

  // Define perimeter path: front-left corner → front-right corner → back-right corner → back-left corner → front-left corner
  // Each segment defines: start point, end point, which edge it's on
  const perimeterSegments: Array<{
    start: [number, number, number];
    end: [number, number, number];
    edge: 'front' | 'right' | 'back' | 'left';
    edgeLength: number;
    edgeStartDist: number; // Distance from perimeter start to edge start
  }> = [
    {
      start: [-length / 2, height + railingHeight / 2, -width / 2],
      end: [length / 2, height + railingHeight / 2, -width / 2],
      edge: 'front',
      edgeLength: length,
      edgeStartDist: 0,
    },
    {
      start: [length / 2, height + railingHeight / 2, -width / 2],
      end: [length / 2, height + railingHeight / 2, width / 2],
      edge: 'right',
      edgeLength: width,
      edgeStartDist: length,
    },
    {
      start: [length / 2, height + railingHeight / 2, width / 2],
      end: [-length / 2, height + railingHeight / 2, width / 2],
      edge: 'back',
      edgeLength: length,
      edgeStartDist: length + width,
    },
    {
      start: [-length / 2, height + railingHeight / 2, width / 2],
      end: [-length / 2, height + railingHeight / 2, -width / 2],
      edge: 'left',
      edgeLength: width,
      edgeStartDist: 2 * length + width,
    },
  ];

  // Helper to check if a position on front edge overlaps with stairs/gates
  const frontEdgeHasGap = (xPos: number): boolean => {
    return stairsXRanges.some(([minX, maxX]) => xPos >= minX && xPos <= maxX) ||
           palletGatesXRanges.some(([minX, maxX]) => xPos >= minX && xPos <= maxX);
  };

  // Create continuous railing segments around the perimeter
  const railingElements: React.JSX.Element[] = [];
  let currentDistance = 0; // Distance along perimeter where we're currently placing railings
  let remainingLength = Math.min(totalRailingLength, perimeter);

  while (remainingLength > 0) {
    // Find which edge we're on
    const edgeIdx = perimeterSegments.findIndex((seg, idx) => {
      const nextEdgeStart = idx < perimeterSegments.length - 1 
        ? perimeterSegments[idx + 1].edgeStartDist 
        : perimeter;
      return currentDistance >= seg.edgeStartDist && currentDistance < nextEdgeStart;
    });

    if (edgeIdx === -1) break; // Safety check

    const edge = perimeterSegments[edgeIdx];
    const distanceAlongEdge = currentDistance - edge.edgeStartDist;
    const remainingOnEdge = edge.edgeLength - distanceAlongEdge;
    
    // Calculate segment length for this piece
    const segmentLen = Math.min(remainingLength, remainingOnEdge, 3); // Max 3m segments for visual clarity

    // Calculate position along this edge
    const t = (distanceAlongEdge + segmentLen / 2) / edge.edgeLength; // Center of segment
    const posX = edge.start[0] + (edge.end[0] - edge.start[0]) * t;
    const posY = edge.start[1];
    const posZ = edge.start[2] + (edge.end[2] - edge.start[2]) * t;

    // Check if this segment is on the front edge and overlaps with gaps
    let shouldSkip = false;
    if (edge.edge === 'front') {
      // Check multiple points along the segment for gaps
      const checkPoints = 5;
      for (let i = 0; i < checkPoints; i++) {
        const checkT = (distanceAlongEdge + (i / (checkPoints - 1)) * segmentLen) / edge.edgeLength;
        const checkX = edge.start[0] + (edge.end[0] - edge.start[0]) * checkT;
        if (frontEdgeHasGap(checkX)) {
          shouldSkip = true;
          break;
        }
      }
    }

    if (!shouldSkip) {
      // Determine if this is a horizontal or vertical segment
      const isHorizontal = edge.edge === 'front' || edge.edge === 'back';
      
      // Calculate number of posts for this segment
      const numPosts = Math.max(2, Math.ceil(segmentLen / postSpacing));
      
      railingElements.push(
        <group key={`railing-${currentDistance}`} position={[posX, posY, posZ]}>
          {/* Main railing bar */}
          <mesh>
            <boxGeometry
              args={isHorizontal ? [segmentLen, 0.05, 0.05] : [0.05, 0.05, segmentLen]}
            />
            <meshStandardMaterial color="#555555" />
          </mesh>
          {/* Top bar */}
          <mesh position={[0, railingHeight / 2, 0]}>
            <boxGeometry
              args={isHorizontal ? [segmentLen, 0.05, 0.05] : [0.05, 0.05, segmentLen]}
            />
            <meshStandardMaterial color="#555555" />
          </mesh>
          {/* Bottom bar */}
          <mesh position={[0, -railingHeight / 2, 0]}>
            <boxGeometry
              args={isHorizontal ? [segmentLen, 0.05, 0.05] : [0.05, 0.05, segmentLen]}
            />
            <meshStandardMaterial color="#555555" />
          </mesh>
          {/* Vertical support posts */}
          {Array.from({ length: numPosts }).map((_, i) => {
            const postT = i / (numPosts - 1) - 0.5; // -0.5 to 0.5
            const postOffset = postT * segmentLen;
            return (
              <mesh
                key={i}
                position={[
                  isHorizontal ? postOffset : 0,
                  0,
                  isHorizontal ? 0 : postOffset,
                ]}
              >
                <boxGeometry args={[0.03, railingHeight, 0.03]} />
                <meshStandardMaterial color="#555555" />
              </mesh>
            );
          })}
        </group>
      );
    }

    currentDistance += segmentLen;
    remainingLength -= segmentLen;

    // If we've completed the perimeter, wrap around
    if (currentDistance >= perimeter) {
      currentDistance = 0;
    }

    // Safety check to prevent infinite loops
    if (segmentLen === 0) break;
  }

  return <>{railingElements}</>;
}

// Stairs component
function Stairs({
  length: _length,
  width,
  height,
  index: _index,
  quantity,
}: {
  length: number;
  width: number;
  height: number;
  index: number;
  quantity: number;
}) {
  const stairWidth = 1.0; // 1 meter wide
  const stepHeight = 0.2; // 0.2 meters per step
  const stepDepth = 0.3; // 0.3 meters depth per step
  const numSteps = Math.ceil(height / stepHeight);

  return (
    <group position={[0, 0, -width / 2]}>
      {Array.from({ length: quantity }).map((_, qIdx) => {
        // Center stairs: for quantity=1: 0, quantity=2: -1,1, quantity=3: -2,0,2, etc.
        const offsetX = (qIdx - (quantity - 1) / 2) * 2;
        return (
          <group key={qIdx} position={[offsetX, 0, 0]}>
            {/* Vertical support beams on both sides */}
            <mesh position={[-stairWidth / 2, height / 2, -stepDepth / 2]}>
              <boxGeometry args={[0.1, height, 0.1]} />
              <meshStandardMaterial color="#555555" />
            </mesh>
            <mesh position={[stairWidth / 2, height / 2, -stepDepth / 2]}>
              <boxGeometry args={[0.1, height, 0.1]} />
              <meshStandardMaterial color="#555555" />
            </mesh>
            {/* Steps - positioned progressively outward to create proper stair structure */}
            {Array.from({ length: numSteps }).map((_, stepIdx) => {
              const stepY = stepIdx * stepHeight + stepHeight / 2;
              // Position steps progressively outward: top step flush with mezzanine edge, bottom step extends furthest
              const stepZ = -((numSteps - 1 - stepIdx) * stepDepth + stepDepth / 2);
              return (
                <mesh
                  key={stepIdx}
                  position={[0, stepY, stepZ]}
                >
                  <boxGeometry args={[stairWidth, 0.05, stepDepth]} />
                  <meshStandardMaterial color="#555555" />
                </mesh>
              );
            })}
          </group>
        );
      })}
    </group>
  );
}

// Pallet gate component
function PalletGate({
  length: _length,
  width,
  height,
  positions,
}: {
  length: number;
  width: number;
  height: number;
  positions: Array<{ x: number; width: number }>;
}) {
  const railingHeight = 1.1; // 1.1 meters high (matches railings)

  return (
    <>
      {positions.map((pos, qIdx) => {
        // Position at the front edge, exactly like railings
        const basePosition: [number, number, number] = [
          pos.x,
          height + railingHeight / 2,
          -width / 2
        ];
        
        return (
          <group key={qIdx} position={basePosition}>
            {/* Main railing bar (middle) */}
            <mesh>
              <boxGeometry args={[pos.width, 0.05, 0.05]} />
              <meshStandardMaterial color="#ffd700" />
            </mesh>
            {/* Top bar */}
            <mesh position={[0, railingHeight / 2, 0]}>
              <boxGeometry args={[pos.width, 0.05, 0.05]} />
              <meshStandardMaterial color="#ffd700" />
            </mesh>
            {/* Bottom bar */}
            <mesh position={[0, -railingHeight / 2, 0]}>
              <boxGeometry args={[pos.width, 0.05, 0.05]} />
              <meshStandardMaterial color="#ffd700" />
            </mesh>
            {/* Vertical supports */}
            {Array.from({ length: Math.max(1, Math.floor(pos.width / 2)) }).map((_, i) => (
              <mesh
                key={i}
                position={[
                  (i - Math.floor(pos.width / 4)) * 2,
                  0,
                  0,
                ]}
              >
                <boxGeometry args={[0.03, railingHeight, 0.03]} />
                <meshStandardMaterial color="#ffd700" />
              </mesh>
            ))}
          </group>
        );
      })}
    </>
  );
}

