import type * as React from 'react';

import { cn } from '@/lib/utils';

function Label({ className, ...props }: React.ComponentProps<'label'>) {
  return (
    // oxlint-disable-next-line jsx-a11y/label-has-associated-control
    <label
      className={cn('text-sm font-semibold text-foreground select-none', className)}
      {...props}
    />
  );
}

export { Label };
