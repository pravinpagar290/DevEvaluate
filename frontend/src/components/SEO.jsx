import { Helmet } from 'react-helmet-async';

export default function SEO({ title, description, name, type = 'website', url, image, schema }) {
  return (
    <Helmet>
      {/* Standard metadata tags */}
      <title>{title ? `${title} | DevEvaluate` : 'DevEvaluate - Code Together, Learn Together'}</title>
      <meta name='description' content={description || 'The ultimate platform for collaborative coding interviews and pair programming.'} />
      
      {/* End standard metadata tags */}
      {/* Facebook tags */}
      <meta property='og:type' content={type} />
      <meta property='og:title' content={title ? `${title} | DevEvaluate` : 'DevEvaluate'} />
      <meta property='og:description' content={description || 'The ultimate platform for collaborative coding interviews and pair programming.'} />
      {url && <meta property='og:url' content={url} />}
      {image && <meta property='og:image' content={image} />}
      {/* End Facebook tags */}
      
      {/* Twitter tags */}
      <meta name='twitter:creator' content={name || '@DevEvaluate'} />
      <meta name='twitter:card' content={image ? 'summary_large_image' : 'summary'} />
      <meta name='twitter:title' content={title ? `${title} | DevEvaluate` : 'DevEvaluate'} />
      <meta name='twitter:description' content={description || 'The ultimate platform for collaborative coding interviews and pair programming.'} />
      {image && <meta name='twitter:image' content={image} />}
      {/* End Twitter tags */}
      
      {url && <link rel="canonical" href={url} />}
      
      {/* Schema / Structured Data */}
      {schema && (
        <script type="application/ld+json">
          {JSON.stringify(schema)}
        </script>
      )}
    </Helmet>
  );
}
