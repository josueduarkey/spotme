/**
 * Mapa de íconos lucide del sistema: una sola fuente para categorías y capas,
 * para que lugares/negocios se vean igual en cards, marcadores y fichas.
 */
import {
  Building2,
  Calendar,
  Camera,
  Landmark,
  Leaf,
  LucideIcon,
  Mountain,
  Recycle,
  ScrollText,
  Store,
  UtensilsCrossed,
  Waves,
} from 'lucide-react-native';
import { Categoria } from '../constants/mock';

export const ICONO_CATEGORIA: Record<Categoria, LucideIcon> = {
  naturaleza: Leaf,
  cultura: Landmark,
  gastronomia: UtensilsCrossed,
  aventura: Mountain,
  playa: Waves,
  historia: ScrollText,
  urbano: Building2,
};

export const IconoNegocio: LucideIcon = Store;
export const IconoActividad: LucideIcon = Camera;
export const IconoEventos: LucideIcon = Calendar;
export const IconoRetos: LucideIcon = Recycle;
