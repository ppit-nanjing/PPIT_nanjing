"use client";

// Interactive org chart built on @xyflow/react (React Flow v12). Replaces the
// old hand-rolled nested-<ul> chart: same data (OrgNodeData tree), but now
// with proper pan/zoom, draggable nodes, and edges that stay attached when a
// node is moved. Node visuals reuse the exact same Tailwind card markup as
// the cards/tree views so all three views stay visually consistent.
import { useMemo } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  Handle,
  Position,
  type Edge,
  type Node,
  type NodeProps,
  type NodeTypes,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Crown, Building2, Users } from "lucide-react";
import { useT } from "@/lib/i18n/client";
import type { OrgNodeData } from "@/components/org-explorer";
import { MemberRow } from "@/components/org-explorer";

const UNIT_W = 264;
const CARD_H = 230; // generous estimate - compact cards cap at 3 member rows
const H_GAP = 40;
const V_GAP = 72;
const APEX_H = 96;

type LaidNode = { node: OrgNodeData; x: number; y: number };

function subtreeWidth(n: OrgNodeData): number {
  if (n.children.length === 0) return UNIT_W;
  const kids =
    n.children.reduce((sum, c) => sum + subtreeWidth(c), 0) + H_GAP * (n.children.length - 1);
  return Math.max(UNIT_W, kids);
}

function layoutTree(units: OrgNodeData[]) {
  const laid: LaidNode[] = [];
  const totalW =
    units.reduce((sum, u) => sum + subtreeWidth(u), 0) + H_GAP * Math.max(0, units.length - 1);

  let cursorX = 0;
  const place = (n: OrgNodeData, left: number, y: number) => {
    const w = subtreeWidth(n);
    laid.push({ node: n, x: left + w / 2 - UNIT_W / 2, y });
    let childLeft = left;
    for (const c of n.children) {
      place(c, childLeft, y + CARD_H + V_GAP);
      childLeft += subtreeWidth(c) + H_GAP;
    }
  };
  for (const u of units) {
    place(u, cursorX, APEX_H + V_GAP);
    cursorX += subtreeWidth(u) + H_GAP;
  }

  return { laid, totalW: Math.max(totalW, UNIT_W) };
}

type FlowData = { org: OrgNodeData };

function ApexFlowNode() {
  return (
    <div
      className="ppit-node ppit-node-apex"
      style={{ borderTopColor: "var(--color-primary)" }}
    >
      <Handle type="source" position={Position.Bottom} className="!bg-outline-variant !border-none" />
      <div className="flex items-center gap-2">
        <span className="ppit-node-ico" style={{ color: "var(--color-primary)" }}>
          <Crown size={16} style={{ color: "var(--color-primary)" }} />
        </span>
        <div>
          <h2 className="text-headline-md text-on-background leading-tight">PPIT Nanjing</h2>
          <p className="text-label-caps text-on-surface-variant">Kabinet Maju</p>
        </div>
      </div>
    </div>
  );
}

function UnitFlowNode({ data }: NodeProps) {
  const t = useT();
  const { org } = data as FlowData;
  const cap = 3;
  return (
    <div
      className="ppit-node text-left"
      style={{ borderTopColor: org.color }}
    >
      <Handle type="target" position={Position.Top} className="!bg-outline-variant !border-none" />
      <Handle type="source" position={Position.Bottom} className="!bg-outline-variant !border-none" />
      <div className="flex items-center gap-2 mb-1.5 pointer-events-none">
        <span className="ppit-node-ico shrink-0" style={{ color: org.color }}>
          {org.name.startsWith("Badan Pengurus") ? (
            <Users style={{ color: org.color }} />
          ) : (
            <Building2 style={{ color: org.color }} />
          )}
        </span>
        <h3 className="text-body-md font-semibold text-on-background leading-tight">{org.name}</h3>
      </div>
      {org.description && (
        <p className="text-label-caps text-on-surface-variant leading-snug mb-2 pointer-events-none">
          {org.description}
        </p>
      )}
      {org.members.length > 0 && (
        <div className="flex flex-col gap-2 mt-1 pt-2 border-t border-outline-variant pointer-events-none">
          {org.members.slice(0, cap).map((m, i) => (
            <MemberRow key={`${org.id}-${i}`} member={m} compact showSocials={false} />
          ))}
          {org.members.length > cap && (
            <p className="text-label-caps text-on-surface-variant">
              {t("org.explorer.more", { n: org.members.length - cap })}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export function OrgFlow({ units, onSelect }: { units: OrgNodeData[]; onSelect: (n: OrgNodeData) => void }) {
  const { nodes, edges } = useMemo(() => {
    const { laid, totalW } = layoutTree(units);

    const flowNodes: Node[] = [
      {
        id: "apex",
        type: "apex",
        position: { x: totalW / 2 - UNIT_W / 2, y: 0 },
        data: {},
        draggable: false,
      },
      ...laid.map((l): Node => ({
        id: l.node.id,
        type: "unit",
        position: { x: l.x, y: l.y },
        data: { org: l.node },
      })),
    ];

    const flowEdges: Edge[] = [];
    // Apex -> each top-level unit.
    for (const u of units) {
      flowEdges.push({
        id: `apex-${u.id}`,
        source: "apex",
        target: u.id,
        type: "smoothstep",
        style: { stroke: "var(--color-outline-variant)", strokeWidth: 1.5 },
      });
    }
    // Unit -> its divisions.
    for (const l of laid) {
      for (const c of l.node.children) {
        flowEdges.push({
          id: `${l.node.id}-${c.id}`,
          source: l.node.id,
          target: c.id,
          type: "smoothstep",
          style: { stroke: "var(--color-outline-variant)", strokeWidth: 1.5 },
        });
      }
    }

    return { nodes: flowNodes, edges: flowEdges };
  }, [units]);

  const nodeTypes: NodeTypes = { apex: ApexFlowNode, unit: UnitFlowNode };

  return (
    <div className="h-[70vh] min-h-[520px] rounded-xl border border-outline-variant bg-surface-container-lowest overflow-hidden ppit-org-flow">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.15 }}
        minZoom={0.2}
        maxZoom={1.5}
        proOptions={{ hideAttribution: true }}
        nodesConnectable={false}
        onNodeClick={(_, node) => {
          if (node.type === "unit") onSelect((node.data as FlowData).org);
        }}
      >
        <Background gap={24} color="var(--color-outline-variant)" className="opacity-40" />
        <Controls showInteractive={false} position="bottom-right" />
      </ReactFlow>
    </div>
  );
}
