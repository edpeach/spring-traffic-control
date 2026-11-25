import { z } from 'zod';
import { NearestStationSchema } from '../../stations/models/station.model';

export const AgentProviderSchema = z.enum(['OLLAMA', 'GEMINI']);
export type AgentProvider = z.infer<typeof AgentProviderSchema>;

export const ProviderStatusSchema = z.object({
  id: AgentProviderSchema,
  label: z.string(),
  model: z.string(),
  available: z.boolean(),
  default: z.boolean(),
});

export type ProviderStatus = z.infer<typeof ProviderStatusSchema>;

export const NearestAirportsSurfaceSchema = z
  .object({
    icao24: z.string().nullable().optional().describe('Aircraft ICAO24 transponder hex'),
    emergencyOnly: z
      .boolean()
      .default(false)
      .describe('Whether emergency medical filter was applied'),
    airports: z
      .array(NearestStationSchema)
      .default([])
      .describe('Ranked nearest airports with distance in km'),
  })
  .describe('Ranked list of nearest airports for a flight or location');

export const NEAREST_AIRPORTS_JSON_SCHEMA = z.toJSONSchema(NearestAirportsSurfaceSchema);

export interface A2UiSurfaceState {
  surfaceId: string;
  component: string;
  data: Record<string, unknown>;
}

export interface ToolCallTrace {
  id: string;
  name: string;
  args: string;
  status: 'running' | 'done';
}

export interface AgentChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  reasoning: string;
  toolCalls: ToolCallTrace[];
  surfaces: A2UiSurfaceState[];
  createdAt: number;
}

export interface AguiWebappAction {
  action: string;
  params: Record<string, unknown>;
}
