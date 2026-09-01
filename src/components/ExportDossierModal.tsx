import React, { useState } from 'react';
import { TECHNICAL_SECTIONS, SOURCES_CATALOG, CREW_ROSTER, COLOR_PALETTE, STROKE_PHASES } from '../data/technicalReferenceData';
import { Download, Copy, Check, X, FileCode, FileText, Code2, Database } from 'lucide-react';

interface ExportDossierModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ExportDossierModal: React.FC<ExportDossierModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'MARKDOWN' | 'JSON' | 'BLENDER_PYTHON' | 'UE5_CSV'>('MARKDOWN');
  const [copied, setCopied] = useState<boolean>(false);

  if (!isOpen) return null;

  // Generate Python Script for Blender
  const blenderScript = `"""
BLENDER 4.x PYTHON SCRIPT: NGO_ST_TUMNUP2_2024_MASTER
Procedural generation script for Khmer Ngo racing boat Tum Núp 2 (Sóc Trăng 2024 Champion)
Scale: 1 Blender Unit = 1 Meter
"""

import bpy
import bmesh
import math

def generate_tumnup2_boat():
    # 1. Clear existing mesh object
    if "NgoBoat_TumNup2_Master" in bpy.data.objects:
        bpy.data.objects.remove(bpy.data.objects["NgoBoat_TumNup2_Master"], do_unlink=True)
    
    # 2. Dimensions
    LOA = 30.20        # Length Overall (meters)
    MAX_BEAM = 1.16    # Maximum Beam at Midship (meters)
    MID_DEPTH = 0.48   # Keel to gunwale depth (meters)
    PROW_RISE = 1.38   # Prow tip rise above baseline
    STERN_RISE = 1.52  # Stern fin rise above baseline
    STATIONS = 36      # Number of lofted stations
    SLICES = 16        # Points per cross-section
    
    # 3. Create Mesh & BMesh
    mesh = bpy.data.meshes.new("Mesh_NgoBoat_TumNup2")
    bm = bmesh.new()
    
    station_loops = []
    
    for i in range(STATIONS + 1):
        u = i / STATIONS
        x = (u - 0.5) * LOA
        
        # Beam formula
        if u > 0.88:
            beam = 0.08 + (1.0 - (u - 0.88)/0.12) * (MAX_BEAM * 0.40 - 0.08)
        elif u < 0.12:
            beam = 0.14 + (u / 0.12) * (MAX_BEAM * 0.45 - 0.14)
        else:
            beam = MAX_BEAM * math.sin(u * math.pi)
            
        # Rocker & Sheer formula
        rocker_y = math.pow(abs(u - 0.5) * 2.0, 2.2) * 0.26
        if u > 0.75:
            factor = (u - 0.75) / 0.25
            gunwale_y = 0.46 + math.pow(factor, 1.8) * (PROW_RISE - 0.46)
        elif u < 0.25:
            factor = (0.25 - u) / 0.25
            gunwale_y = 0.46 + math.pow(factor, 1.8) * (STERN_RISE - 0.46)
        else:
            gunwale_y = 0.46
            
        loop = []
        for j in range(SLICES + 1):
            v = j / SLICES
            angle = (v - 0.5) * math.pi
            
            z = math.sin(angle) * (beam / 2.0)
            y = rocker_y + (1.0 - math.cos(angle)) * (gunwale_y - rocker_y)
            
            # Create vertex (X: Long, Y: Up, Z: Lat)
            vert = bm.verts.new((x, z, y))
            loop.append(vert)
            
        station_loops.append(loop)
        
    # Create quad faces between stations
    for i in range(STATIONS):
        for j in range(SLICES):
            v1 = station_loops[i][j]
            v2 = station_loops[i+1][j]
            v3 = station_loops[i+1][j+1]
            v4 = station_loops[i][j+1]
            bm.faces.new((v1, v2, v3, v4))
            
    bm.to_mesh(mesh)
    bm.free()
    
    obj = bpy.data.objects.new("NgoBoat_TumNup2_Master", mesh)
    bpy.context.collection.objects.link(obj)
    
    # 4. Generate 26 Seating Thwarts (Đòn Ngồi)
    for k in range(26):
        u_thwart = 0.12 + (k / 25.0) * 0.74
        x_thwart = (u_thwart - 0.5) * LOA
        b_thwart = MAX_BEAM * math.sin(u_thwart * math.pi) * 0.94
        
        bpy.ops.mesh.primitive_cube_add(
            size=1.0,
            location=(x_thwart, 0.0, 0.42),
            scale=(0.08, b_thwart, 0.04)
        )
        thwart_obj = bpy.context.active_object
        thwart_obj.name = f"Thwart_{k+1:02d}"
        thwart_obj.parent = obj
        
    # 5. Generate Longitudinal Kềm Tension Pole (Cây Kềm)
    bpy.ops.mesh.primitive_cylinder_add(
        radius=0.09,
        depth=24.5,
        location=(0.0, 0.0, 0.22),
        rotation=(0, math.pi/2, 0)
    )
    kem_obj = bpy.context.active_object
    kem_obj.name = "Longitudinal_Kem_Pole"
    kem_obj.parent = obj
    
    print("SUCCESS: Generated NGO_ST_TUMNUP2_2024_MASTER in Blender!")

generate_tumnup2_boat()
`;

  // Generate Markdown text
  const generateMarkdown = () => {
    let md = `# TECHNICAL DOSSIER: NGO BOAT RACING — TUM NÚP 2 (SÓC TRĂNG 2024)\n`;
    md += `**Target Asset**: \`NGO_ST_TUMNUP2_2024_MASTER\`\n`;
    md += `**Championship**: Lễ hội Oóc Om Bóc - Đua ghe Ngo Sóc Trăng 2024 (Men's Champion)\n`;
    md += `**Origin**: Chùa Bô Tum Răng Sây Tum Núp (An Ninh, Châu Thành, Sóc Trăng)\n`;
    md += `**Accuracy Mandate**: ZERO INVENTED GEOMETRY. All specifications labeled CONFIRMED, APPROXIMATE, INFERRED, UNKNOWN.\n\n`;

    md += `## 1. SOURCE SEPARATION & TRIAGE MATRIX\n`;
    SOURCES_CATALOG.forEach((src) => {
      md += `- **[Source #${src.id}] ${src.title}** (${src.categoryLabel})\n`;
      md += `  - *URL*: ${src.url}\n`;
      md += `  - *Subject*: ${src.primarySubject}\n`;
      md += `  - *Evidence*: ${src.evidenceNotes}\n\n`;
    });

    md += `## 2. 25 TECHNICAL SECTIONS & CAD SPECIFICATIONS\n\n`;
    TECHNICAL_SECTIONS.forEach((sec) => {
      md += `### Section ${sec.sectionNumber}: ${sec.title} (${sec.vietnameseTitle})\n`;
      md += `**Status**: \`${sec.confidence}\`\n\n`;
      md += `${sec.summary}\n\n`;
      md += `| Parameter | Value | Confidence |\n|---|---|---|\n`;
      sec.specifications.forEach((spec) => {
        md += `| ${spec.label} | ${spec.value} | \`${spec.confidence}\` |\n`;
      });
      md += `\n`;
      if (sec.geometryDetails) {
        md += `**3D / Blender Specs**: ${sec.geometryDetails.blenderDimensions || 'N/A'}\n`;
        md += `**Topology**: ${sec.geometryDetails.meshTopology || 'N/A'}\n`;
        md += `**Shader & Engine Setup**: ${sec.geometryDetails.materialShader || 'N/A'}\n\n`;
      }
      md += `**Verified Sources**: ${sec.verifiedSources.map((id) => `#${id}`).join(', ')}\n\n---\n\n`;
    });

    return md;
  };

  const getExportContent = () => {
    switch (activeTab) {
      case 'MARKDOWN':
        return generateMarkdown();
      case 'JSON':
        return JSON.stringify(
          {
            assetTag: 'NGO_ST_TUMNUP2_2024_MASTER',
            metadata: {
              title: 'Tum Núp 2 Sóc Trăng 2024 Technical Reference',
              exportDate: new Date().toISOString(),
              totalSections: TECHNICAL_SECTIONS.length,
              totalSources: SOURCES_CATALOG.length,
            },
            sources: SOURCES_CATALOG,
            sections: TECHNICAL_SECTIONS,
            crewRoster: CREW_ROSTER,
            colorPalette: COLOR_PALETTE,
            strokePhases: STROKE_PHASES,
          },
          null,
          2
        );
      case 'BLENDER_PYTHON':
        return blenderScript;
      case 'UE5_CSV':
        let csv = 'RoleId,RoleName,StationMeters,Count,SeatedStanding,PaddleLengthM,SocketName\n';
        CREW_ROSTER.forEach((crew, idx) => {
          csv += `"${crew.roleId}","${crew.roleName}","${crew.positionRangeMeters}",${crew.count},"${crew.seatedOrStanding}",${crew.paddleLengthM},"socket_crew_${crew.roleId.toLowerCase()}"\n`;
        });
        return csv;
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(getExportContent());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const content = getExportContent();
    let filename = 'NGO_ST_TUMNUP2_2024_MASTER_Dossier.md';
    let mimeType = 'text/markdown';

    if (activeTab === 'JSON') {
      filename = 'NGO_ST_TUMNUP2_2024_MASTER_Specs.json';
      mimeType = 'application/json';
    } else if (activeTab === 'BLENDER_PYTHON') {
      filename = 'generate_tumnup2_ngo_boat.py';
      mimeType = 'text/x-python';
    } else if (activeTab === 'UE5_CSV') {
      filename = 'TumNup2_Crew_Sockets.csv';
      mimeType = 'text/csv';
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="relative w-full max-w-4xl max-h-[90vh] flex flex-col rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-950 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/20">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white font-serif">
                Export Technical Reference Dossier
              </h3>
              <p className="text-xs text-slate-400 font-mono">
                Asset: NGO_ST_TUMNUP2_2024_MASTER
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Controls */}
        <div className="flex items-center justify-between px-6 py-3 bg-slate-900 border-b border-slate-800 text-xs">
          <div className="flex items-center gap-2 font-mono">
            <button
              onClick={() => setActiveTab('MARKDOWN')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition ${
                activeTab === 'MARKDOWN'
                  ? 'bg-sky-600 text-white font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Markdown Dossier</span>
            </button>

            <button
              onClick={() => setActiveTab('JSON')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition ${
                activeTab === 'JSON'
                  ? 'bg-sky-600 text-white font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Database className="w-3.5 h-3.5" />
              <span>Full JSON Spec</span>
            </button>

            <button
              onClick={() => setActiveTab('BLENDER_PYTHON')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition ${
                activeTab === 'BLENDER_PYTHON'
                  ? 'bg-amber-600 text-white font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <FileCode className="w-3.5 h-3.5" />
              <span>Blender Python Script</span>
            </button>

            <button
              onClick={() => setActiveTab('UE5_CSV')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition ${
                activeTab === 'UE5_CSV'
                  ? 'bg-purple-600 text-white font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Code2 className="w-3.5 h-3.5" />
              <span>UE5 Crew Sockets (CSV)</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-mono text-xs transition"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied to Clipboard' : 'Copy'}</span>
            </button>

            <button
              onClick={handleDownload}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-xs font-bold transition"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download File</span>
            </button>
          </div>
        </div>

        {/* Content Box */}
        <div className="flex-1 p-6 overflow-auto bg-slate-950">
          <pre className="text-xs font-mono text-slate-300 leading-relaxed whitespace-pre-wrap select-all bg-slate-900/60 p-4 rounded-xl border border-slate-800">
            {getExportContent()}
          </pre>
        </div>
      </div>
    </div>
  );
};
