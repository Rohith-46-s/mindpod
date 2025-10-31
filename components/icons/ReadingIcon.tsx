import React from 'react';

const ReadingIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m-1.5 18-2.25-2.25m0 0L7.5 15.75m-2.25 2.25H5.25m4.5 0-2.25-2.25m0 0L12 15.75m-2.25 2.25H9.75M16.5 18.75-18 15.75m0 0L18 12.75m-1.5 3L15 12.75M3 8.25V6a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 6v12a2.25 2.25 0 0 1-2.25-2.25H5.25A2.25 2.25 0 0 1 3 18.75V8.25Z" />
  </svg>
);

export default ReadingIcon;