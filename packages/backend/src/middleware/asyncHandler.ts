// ═══════════════════════════════════════════════
// asyncHandler — Eliminates try/catch boilerplate in Express route handlers
// ═══════════════════════════════════════════════
// Kullanım:
//   router.get('/', asyncHandler(async (req, res) => {
//     const data = await prisma.product.findMany();
//     res.json({ data });
//   }));
//
// Herhangi bir throw veya rejected promise otomatik olarak
// errorHandler middleware'ına yönlendirilir.

import { Request, Response, NextFunction, RequestHandler } from 'express';

type AsyncRequestHandler = (
  req: Request,
  res: Response,
  next: NextFunction,
) => Promise<void> | void;

export function asyncHandler(fn: AsyncRequestHandler): RequestHandler {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
