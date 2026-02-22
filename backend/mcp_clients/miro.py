import os
from mcp.client.stdio import StdioServerParameters
from .base import BaseMCPClient


class MiroMCP(BaseMCPClient):

    @property
    def name(self) -> str:
        return "Miro"

    def server_params(self) -> StdioServerParameters:
        # Miro MCP server uses the @modelcontextprotocol/server-miro package
        return StdioServerParameters(
            command="npx",
            args=[
                "-y",
                "@modelcontextprotocol/server-miro",
            ],
            env={"PATH": os.environ.get("PATH", "")},
        )

    # ── Diagram Creation ────────────────────────────────────────

    async def get_dsl_format(self, board_id: str, diagram_type: str) -> dict:
        """Get DSL format specification for a diagram type."""
        return await self._call_tool("diagram_get_dsl", {
            "board_id": board_id,
            "diagram_type": diagram_type,
        })

    async def create_diagram(
        self,
        board_id: str,
        diagram_type: str,
        title: str,
        diagram_dsl: str,
        x: float = None,
        y: float = None,
        parent_id: str = None,
    ) -> dict:
        """Create a diagram on a Miro board from DSL text."""
        return await self._call_tool("diagram_create", {
            "board_id": board_id,
            "diagram_type": diagram_type,
            "title": title,
            "diagram_dsl": diagram_dsl,
            "x": x,
            "y": y,
            "parent_id": parent_id,
        })

    async def create_flowchart(
        self,
        board_id: str,
        title: str,
        mermaid_flowchart: str,
        x: float = None,
        y: float = None,
        parent_id: str = None,
    ) -> dict:
        """Create a flowchart from Mermaid syntax by converting to DSL."""
        # First get the DSL format
        dsl_format = await self.get_dsl_format(board_id, "flowchart")
        
        # Convert Mermaid to DSL (simplified conversion)
        dsl_content = self._convert_mermaid_to_dsl(mermaid_flowchart)
        
        # Create the diagram
        return await self.create_diagram(
            board_id=board_id,
            diagram_type="flowchart",
            title=title,
            diagram_dsl=dsl_content,
            x=x,
            y=y,
            parent_id=parent_id,
        )

    # ── Board Operations ────────────────────────────────────────

    async def list_board_items(
        self,
        board_id: str,
        limit: int = 50,
        cursor: str = None,
        item_type: str = None,
        item_id: str = None,
    ) -> dict:
        """List items on a Miro board."""
        return await self._call_tool("board_list_items", {
            "board_id": board_id,
            "limit": limit,
            "cursor": cursor,
            "item_type": item_type,
            "item_id": item_id,
        })

    async def explore_board(self, board_url: str) -> dict:
        """Explore high-level items on a Miro board."""
        return await self._call_tool("context_explore", {
            "board_url": board_url,
        })

    async def get_context(self, item_url: str) -> dict:
        """Get text context from a specific item on a Miro board."""
        return await self._call_tool("context_get", {
            "item_url": item_url,
        })

    # ── Table Operations ────────────────────────────────────────

    async def create_table(
        self,
        board_id: str,
        table_title: str,
        columns: list[dict],
    ) -> dict:
        """Create a table on a Miro board."""
        return await self._call_tool("table_create", {
            "board_id": board_id,
            "table_title": table_title,
            "columns": columns,
        })

    async def list_table_rows(
        self,
        board_id: str,
        item_id: str = None,
        filter_by: str = None,
        limit: int = None,
        next_cursor: str = None,
    ) -> dict:
        """Get rows from a Miro table."""
        return await self._call_tool("table_list_rows", {
            "board_id": board_id,
            "item_id": item_id,
            "filter_by": filter_by,
            "limit": limit,
            "next_cursor": next_cursor,
        })

    async def sync_table_rows(
        self,
        board_id: str,
        rows: list[dict],
        item_id: str = None,
        key_column: str = None,
    ) -> dict:
        """Add or update table rows."""
        return await self._call_tool("table_sync_rows", {
            "board_id": board_id,
            "rows": rows,
            "item_id": item_id,
            "key_column": key_column,
        })

    # ── Document Operations ─────────────────────────────────────

    async def create_doc(
        self,
        board_id: str,
        content: str = None,
        x: float = None,
        y: float = None,
        parent_id: str = None,
    ) -> dict:
        """Create a document on a Miro board."""
        return await self._call_tool("doc_create", {
            "board_id": board_id,
            "content": content,
            "x": x,
            "y": y,
            "parent_id": parent_id,
        })

    async def get_doc(self, board_id: str, item_id: str = None) -> dict:
        """Read content of a document."""
        return await self._call_tool("doc_get", {
            "board_id": board_id,
            "item_id": item_id,
        })

    async def update_doc(
        self,
        board_id: str,
        old_content: str = "",
        new_content: str = "",
        replace_all: bool = False,
        item_id: str = None,
    ) -> dict:
        """Edit content in a document using find-and-replace."""
        return await self._call_tool("doc_update", {
            "board_id": board_id,
            "old_content": old_content,
            "new_content": new_content,
            "replace_all": replace_all,
            "item_id": item_id,
        })

    # ── Image Operations ────────────────────────────────────────

    async def get_image_url(self, board_id: str, item_id: str = None) -> dict:
        """Get download URL for an image."""
        return await self._call_tool("image_get_url", {
            "board_id": board_id,
            "item_id": item_id,
        })

    async def get_image_data(self, board_id: str, item_id: str = None) -> dict:
        """Get image data."""
        return await self._call_tool("image_get_data", {
            "board_id": board_id,
            "item_id": item_id,
        })

    # ── Helper Methods ──────────────────────────────────────────

    def _convert_mermaid_to_dsl(self, mermaid_content: str) -> str:
        """
        Convert Mermaid flowchart syntax to Miro DSL format.
        This is a simplified converter for basic flowcharts.
        """
        lines = mermaid_content.strip().split('\n')
        
        # Start with basic DSL format
        dsl_lines = [
            "graphdir TD",
            "palette #fff6b6 #c6dcff #adf0c7",
            ""
        ]
        
        # Parse Mermaid and convert to DSL
        node_counter = 1
        nodes = {}
        connections = []
        
        for line in lines:
            line = line.strip()
            if not line or line.startswith('flowchart'):
                continue
                
            # Parse connections like: A[Text] --> B{Decision}
            if '-->' in line:
                parts = line.split('-->')
                if len(parts) == 2:
                    source = parts[0].strip()
                    target = parts[1].strip()
                    
                    # Extract node ID and label
                    source_id = self._extract_node_id(source)
                    target_id = self._extract_node_id(target)
                    source_label = self._extract_node_label(source)
                    target_label = self._extract_node_label(target)
                    
                    # Add nodes if not seen
                    if source_id not in nodes:
                        node_type = self._determine_node_type(source)
                        color_index = self._get_color_index(node_type)
                        nodes[source_id] = f"n{node_counter} {source_label} {node_type} {color_index}"
                        node_counter += 1
                    
                    if target_id not in nodes:
                        node_type = self._determine_node_type(target)
                        color_index = self._get_color_index(node_type)
                        nodes[target_id] = f"n{node_counter} {target_label} {node_type} {color_index}"
                        node_counter += 1
                    
                    # Add connection
                    source_node_num = nodes[source_id].split()[0]
                    target_node_num = nodes[target_id].split()[0]
                    connections.append(f"c {source_node_num} - {target_node_num}")
        
        # Add nodes to DSL
        for node in nodes.values():
            dsl_lines.append(node)
        
        # Add empty line
        dsl_lines.append("")
        
        # Add connections
        for conn in connections:
            dsl_lines.append(conn)
        
        return '\n'.join(dsl_lines)

    def _extract_node_id(self, node_str: str) -> str:
        """Extract node ID from Mermaid syntax like 'A[Label]' or 'B{Decision}'."""
        node_str = node_str.strip()
        if '[' in node_str:
            return node_str.split('[')[0]
        elif '{' in node_str:
            return node_str.split('{')[0]
        elif '(' in node_str:
            return node_str.split('(')[0]
        return node_str

    def _extract_node_label(self, node_str: str) -> str:
        """Extract label from Mermaid syntax."""
        node_str = node_str.strip()
        if '[' in node_str and ']' in node_str:
            return node_str.split('[')[1].split(']')[0]
        elif '{' in node_str and '}' in node_str:
            return node_str.split('{')[1].split('}')[0]
        elif '(' in node_str and ')' in node_str:
            return node_str.split('(')[1].split(')')[0]
        return node_str

    def _determine_node_type(self, node_str: str) -> str:
        """Determine Miro node type from Mermaid syntax."""
        if '{' in node_str:
            return "flowchart-decision"
        elif '(' in node_str:
            return "flowchart-terminator"
        else:
            return "flowchart-process"

    def _get_color_index(self, node_type: str) -> int:
        """Get color index based on node type."""
        if node_type == "flowchart-decision":
            return 1  # Blue
        elif node_type == "flowchart-terminator":
            return 2  # Green
        else:
            return 0  # Yellow