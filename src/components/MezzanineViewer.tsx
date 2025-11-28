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

  // Check if there's a Vinkel stair (corner stair with Repos)
  const vinkelStair = useMemo(
    () => stairs.find((s) => s.stairType?.includes('Vinkel')),
    [stairs]
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

      {/* Repos Platform - only if Vinkel stair exists */}
      {vinkelStair && (
        <ReposPlatform length={length} width={width} height={height} />
      )}

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
            hasRepos={!!vinkelStair}
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
          stairType={stair.stairType}
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
  // Calculate subsections based on 4500mm (4.5m) rule
  const maxSectionSize = 4.5; // 4500mm in meters
  
  // Calculate number of divisions needed for length and width
  const lengthDivisions = Math.ceil(length / maxSectionSize);
  const widthDivisions = Math.ceil(width / maxSectionSize);
  
  // Calculate actual spacing between columns
  const lengthSpacing = length / lengthDivisions;
  const widthSpacing = width / widthDivisions;
  
  // Generate column positions
  const columnPositions: [number, number, number][] = [];
  
  // Create grid of columns
  for (let i = 0; i <= lengthDivisions; i++) {
    for (let j = 0; j <= widthDivisions; j++) {
      const x = -length / 2 + i * lengthSpacing;
      const z = -width / 2 + j * widthSpacing;
      columnPositions.push([x, height / 2, z]);
    }
  }

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

// Repos Platform component - extended platform at front-left corner for Vinkel stairs
function ReposPlatform({
  length,
  width,
  height,
}: {
  length: number;
  width: number;
  height: number;
}) {
  // Fixed dimensions: 3000mm × 1400mm (3m × 1.4m)
  const reposLength = 3.0; // meters
  const reposDepth = 1.4; // meters
  
  // Position at front-left corner
  // X: -length/2 + reposLength/2 (centered on the repos length, starting from left edge)
  // Y: height (at same level as main mezzanine floor)
  // Z: -width/2 - reposDepth/2 (extending outward from front edge)
  const reposX = -length / 2 + reposLength / 2;
  const reposY = height;
  const reposZ = -width / 2 - reposDepth / 2;

  // Calculate support columns for the Repos
  const maxSectionSize = 4.5;
  const lengthDivisions = Math.ceil(reposLength / maxSectionSize);
  const depthDivisions = Math.ceil(reposDepth / maxSectionSize);
  
  const lengthSpacing = reposLength / lengthDivisions;
  const depthSpacing = reposDepth / depthDivisions;
  
  const reposColumnPositions: [number, number, number][] = [];
  
  for (let i = 0; i <= lengthDivisions; i++) {
    for (let j = 0; j <= depthDivisions; j++) {
      const x = reposX - reposLength / 2 + i * lengthSpacing;
      const z = reposZ - reposDepth / 2 + j * depthSpacing;
      reposColumnPositions.push([x, height / 2, z]);
    }
  }

  return (
    <group>
      {/* Repos floor - same material as main mezzanine */}
      <mesh position={[reposX, reposY, reposZ]} rotation={[-Math.PI / 2, 0, 0]}>
        <boxGeometry args={[reposLength, reposDepth, 0.05]} />
        <meshStandardMaterial color="#fffacd" />
      </mesh>
      
      {/* Support columns for Repos */}
      {reposColumnPositions.map((pos, idx) => (
        <mesh key={`repos-col-${idx}`} position={pos}>
          <cylinderGeometry args={[0.1, 0.1, height, 8]} />
          <meshStandardMaterial color="#d3d3d3" />
        </mesh>
      ))}
    </group>
  );
}

// Railings component - creates continuous perimeter railings that wrap around corners
function Railings({
  length,
  width,
  height,
  quantity,
  segmentLength,
  index,
  stairsQuantity,
  palletGatesWidths,
  hasRepos = false,
}: {
  length: number;
  width: number;
  height: number;
  quantity: number;
  segmentLength: number;
  index: number;
  stairsQuantity: number;
  palletGatesWidths: number[];
  hasRepos?: boolean;
}) {
  const railingHeight = 1.1; // 1.1 meters
  const stairWidth = 1.0; // 1 meter wide (matches Stairs component)
  const postSpacing = 2.0; // meters between posts

  // Repos dimensions (fixed)
  const reposLength = 3.0;
  const reposDepth = 1.4;
  const reposZ = -width / 2 - reposDepth / 2;

  // Calculate total perimeter length (including Repos if present)
  let perimeter = 2 * (length + width);
  if (hasRepos) {
    // Add Repos perimeter contribution: left edge (reposDepth) + front extension (reposLength)
    perimeter += reposDepth + reposLength;
  }
  
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

  // Define perimeter path with Repos support
  const perimeterSegments: Array<{
    start: [number, number, number];
    end: [number, number, number];
    edge: 'front' | 'right' | 'back' | 'left' | 'repos-left' | 'repos-front';
    edgeLength: number;
    edgeStartDist: number;
  }> = [];

  let currentDist = 0;

  if (hasRepos) {
    // With Repos: modified perimeter path
    // Start from front-left corner where Repos begins
    const reposLeftX = -length / 2;
    const reposFrontZ = -width / 2;
    const reposOuterZ = reposZ - reposDepth / 2;
    
    // 1. Repos left edge (going outward)
    perimeterSegments.push({
      start: [reposLeftX, height + railingHeight / 2, reposFrontZ],
      end: [reposLeftX, height + railingHeight / 2, reposOuterZ],
      edge: 'repos-left',
      edgeLength: reposDepth,
      edgeStartDist: currentDist,
    });
    currentDist += reposDepth;
    
    // 2. Repos front edge (going right along Repos)
    perimeterSegments.push({
      start: [reposLeftX, height + railingHeight / 2, reposOuterZ],
      end: [reposLeftX + reposLength, height + railingHeight / 2, reposOuterZ],
      edge: 'repos-front',
      edgeLength: reposLength,
      edgeStartDist: currentDist,
    });
    currentDist += reposLength;
    
    // 3. Front edge (from end of Repos to right corner)
    const frontStartX = reposLeftX + reposLength;
    const frontEndX = length / 2;
    const frontLength = frontEndX - frontStartX;
    perimeterSegments.push({
      start: [frontStartX, height + railingHeight / 2, reposFrontZ],
      end: [frontEndX, height + railingHeight / 2, reposFrontZ],
      edge: 'front',
      edgeLength: frontLength,
      edgeStartDist: currentDist,
    });
    currentDist += frontLength;
  } else {
    // Normal front edge (no Repos)
    perimeterSegments.push({
      start: [-length / 2, height + railingHeight / 2, -width / 2],
      end: [length / 2, height + railingHeight / 2, -width / 2],
      edge: 'front',
      edgeLength: length,
      edgeStartDist: currentDist,
    });
    currentDist += length;
  }
  
  // Right edge (same for both cases)
  perimeterSegments.push({
    start: [length / 2, height + railingHeight / 2, -width / 2],
    end: [length / 2, height + railingHeight / 2, width / 2],
    edge: 'right',
    edgeLength: width,
    edgeStartDist: currentDist,
  });
  currentDist += width;
  
  // Back edge (same for both cases)
  perimeterSegments.push({
    start: [length / 2, height + railingHeight / 2, width / 2],
    end: [-length / 2, height + railingHeight / 2, width / 2],
    edge: 'back',
    edgeLength: length,
    edgeStartDist: currentDist,
  });
  currentDist += length;
  
  // Left edge (same for both cases)
  perimeterSegments.push({
    start: [-length / 2, height + railingHeight / 2, width / 2],
    end: [-length / 2, height + railingHeight / 2, -width / 2],
    edge: 'left',
    edgeLength: width,
    edgeStartDist: currentDist,
  });

  // Create continuous railing segments around the perimeter
  const railingElements: React.ReactElement[] = [];
  let currentDistance = 0; // Distance along perimeter where we're currently placing railings
  let remainingLength = Math.min(totalRailingLength, perimeter);
  let iterationCount = 0;
  const maxIterations = 1000; // Prevent infinite loops

  while (remainingLength > 0.01 && iterationCount < maxIterations) {
    iterationCount++;
    
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
    
    // Skip gaps on repos-front edge (where Vinkel stairs are)
    if (edge.edge === 'repos-front' && hasRepos) {
      // Skip the entire Vinkel stair area (centered on Repos)
      currentDistance += remainingOnEdge;
      if (currentDistance >= perimeter) currentDistance = 0;
      continue;
    }
    
    // Check for gaps on front edge (regular stairs/pallet gates)
    if (edge.edge === 'front') {
      const currentXPos = edge.start[0] + (edge.end[0] - edge.start[0]) * (distanceAlongEdge / edge.edgeLength);
      
      // Check if current position is in a gap
      let inGap = false;
      let skipToX = currentXPos;
      
      for (const [minX, maxX] of [...stairsXRanges, ...palletGatesXRanges]) {
        if (currentXPos >= minX && currentXPos <= maxX) {
          inGap = true;
          skipToX = maxX;
          break;
        }
      }
      
      if (inGap) {
        const skipToT = (skipToX - edge.start[0]) / (edge.end[0] - edge.start[0]);
        const skipToDistance = skipToT * edge.edgeLength;
        const skipAmount = Math.max(0.01, skipToDistance - distanceAlongEdge);
        
        currentDistance += skipAmount;
        if (currentDistance >= perimeter) currentDistance = 0;
        continue;
      }
    }
    
    // Calculate segment length for this piece
    let segmentLen = Math.min(remainingLength, remainingOnEdge, 3); // Max 3m segments

    // If on front edge, make sure segment doesn't extend into a gap
    if (edge.edge === 'front') {
      const startXPos = edge.start[0] + (edge.end[0] - edge.start[0]) * (distanceAlongEdge / edge.edgeLength);
      const endXPos = edge.start[0] + (edge.end[0] - edge.start[0]) * ((distanceAlongEdge + segmentLen) / edge.edgeLength);
      
      for (const [minX, _maxX] of [...stairsXRanges, ...palletGatesXRanges]) {
        if (endXPos > minX && startXPos < minX) {
          const truncateT = (minX - edge.start[0]) / (edge.end[0] - edge.start[0]);
          const truncateDistance = truncateT * edge.edgeLength;
          segmentLen = Math.max(0.05, truncateDistance - distanceAlongEdge);
          break;
        }
      }
    }

    if (segmentLen < 0.05) {
      currentDistance += 0.05;
      if (currentDistance >= perimeter) currentDistance = 0;
      continue;
    }

    // Calculate position along this edge
    const t = (distanceAlongEdge + segmentLen / 2) / edge.edgeLength;
    const posX = edge.start[0] + (edge.end[0] - edge.start[0]) * t;
    const posY = edge.start[1];
    const posZ = edge.start[2] + (edge.end[2] - edge.start[2]) * t;

    // Determine orientation
    const isHorizontal = edge.edge === 'front' || edge.edge === 'back' || edge.edge === 'repos-front';
    
    // Calculate number of posts
    const numPosts = Math.max(2, Math.ceil(segmentLen / postSpacing));
    
    railingElements.push(
      <group key={`railing-${index}-${currentDistance.toFixed(2)}`} position={[posX, posY, posZ]}>
        <mesh>
          <boxGeometry
            args={isHorizontal ? [segmentLen, 0.05, 0.05] : [0.05, 0.05, segmentLen]}
          />
          <meshStandardMaterial color="#555555" />
        </mesh>
        <mesh position={[0, railingHeight / 2, 0]}>
          <boxGeometry
            args={isHorizontal ? [segmentLen, 0.05, 0.05] : [0.05, 0.05, segmentLen]}
          />
          <meshStandardMaterial color="#555555" />
        </mesh>
        <mesh position={[0, -railingHeight / 2, 0]}>
          <boxGeometry
            args={isHorizontal ? [segmentLen, 0.05, 0.05] : [0.05, 0.05, segmentLen]}
          />
          <meshStandardMaterial color="#555555" />
        </mesh>
        {Array.from({ length: numPosts }).map((_, i) => {
          const postT = i / (numPosts - 1) - 0.5;
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
    
    remainingLength -= segmentLen;
    currentDistance += segmentLen;

    if (currentDistance >= perimeter) {
      currentDistance = 0;
    }
  }

  return <>{railingElements}</>;
}

// Stairs component
function Stairs({
  length,
  width,
  height,
  index: _index,
  quantity,
  stairType,
}: {
  length: number;
  width: number;
  height: number;
  index: number;
  quantity: number;
  stairType?: string;
}) {
  const isVinkel = stairType?.includes('Vinkel') || false;
  
  // Extract width from stairType (e.g., "Straight 1m" -> 1.0, "Vinkel 1.2m" -> 1.2)
  const stairWidthMatch = stairType?.match(/([\d.]+)m/);
  const stairWidth = stairWidthMatch ? parseFloat(stairWidthMatch[1]) : 1.0;
  
  const stepHeight = 0.2; // 0.2 meters per step
  const stepDepth = 0.3; // 0.3 meters depth per step
  const numSteps = Math.ceil(height / stepHeight);

  // For Vinkel stairs, position on the Repos platform
  if (isVinkel) {
    const reposLength = 3.0;
    const reposDepth = 1.4;
    const reposX = -length / 2 + reposLength / 2;
    const reposZ = -width / 2 - reposDepth / 2;
    
    // Position stairs at the right edge of Repos, descending to the right
    const stairsX = reposX + reposLength / 2; // Right edge of Repos
    const stairsZ = reposZ;
    
    return (
      <group position={[stairsX, 0, stairsZ]} rotation={[0, Math.PI / 2, 0]}>
        {/* Vertical support beams on both sides */}
        <mesh position={[-stairWidth / 2, height / 2, stepDepth / 2]}>
          <boxGeometry args={[0.1, height, 0.1]} />
          <meshStandardMaterial color="#555555" />
        </mesh>
        <mesh position={[stairWidth / 2, height / 2, stepDepth / 2]}>
          <boxGeometry args={[0.1, height, 0.1]} />
          <meshStandardMaterial color="#555555" />
        </mesh>
        {/* Steps - positioned progressively inward to create proper stair structure */}
        {Array.from({ length: numSteps }).map((_, stepIdx) => {
          const stepY = stepIdx * stepHeight + stepHeight / 2;
          // Position steps progressively inward: bottom step furthest out, top step flush with Repos edge
          const stepZ = +((numSteps - 1 - stepIdx) * stepDepth + stepDepth / 2);
          return (
            <mesh key={stepIdx} position={[0, stepY, stepZ]}>
              <boxGeometry args={[stairWidth, 0.05, stepDepth]} />
              <meshStandardMaterial color="#555555" />
            </mesh>
          );
        })}
      </group>
    );
  }

  // Regular straight stairs at front edge
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
            {/* Steps - positioned progressively inward to create proper stair structure */}
            {Array.from({ length: numSteps }).map((_, stepIdx) => {
              const stepY = stepIdx * stepHeight + stepHeight / 2;
              // Position steps progressively inward: bottom step furthest out, top step flush with mezzanine edge
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

