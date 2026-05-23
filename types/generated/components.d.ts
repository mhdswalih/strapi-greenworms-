import type { Schema, Struct } from '@strapi/strapi';

export interface BlocksHero extends Struct.ComponentSchema {
  collectionName: 'components_blocks_heroes';
  info: {
    displayName: 'Hero';
  };
  attributes: {};
}

export interface BlogsBlogs extends Struct.ComponentSchema {
  collectionName: 'components_blogs_blogs_s';
  info: {
    displayName: 'blogs ';
  };
  attributes: {
    Blogs: Schema.Attribute.Component<'shared.rich-text', true>;
    image: Schema.Attribute.Media;
  };
}

export interface SectionsFeatureItem extends Struct.ComponentSchema {
  collectionName: 'components_sections_feature_items';
  info: {
    displayName: 'Feature Item';
  };
  attributes: {
    desc_en: Schema.Attribute.Text;
    desc_ml: Schema.Attribute.Text;
    title_en: Schema.Attribute.String;
    title_ml: Schema.Attribute.String;
  };
}

export interface SectionsTestimonialItem extends Struct.ComponentSchema {
  collectionName: 'components_sections_testimonial_items';
  info: {
    displayName: 'Testimonial Item';
  };
  attributes: {
    eng_name: Schema.Attribute.String;
    eng_shop: Schema.Attribute.String;
    eng_testimonial: Schema.Attribute.Text;
    image: Schema.Attribute.Media<'images' | 'files'>;
    mal_shop: Schema.Attribute.String;
    mal_testimonial: Schema.Attribute.Text;
    ml_name: Schema.Attribute.String;
  };
}

export interface SharedMedia extends Struct.ComponentSchema {
  collectionName: 'components_shared_media';
  info: {
    displayName: 'Media';
    icon: 'file-video';
  };
  attributes: {
    file: Schema.Attribute.Media<'images' | 'files' | 'videos'>;
  };
}

export interface SharedQuote extends Struct.ComponentSchema {
  collectionName: 'components_shared_quotes';
  info: {
    displayName: 'Quote';
    icon: 'indent';
  };
  attributes: {
    body: Schema.Attribute.Text;
    title: Schema.Attribute.String;
  };
}

export interface SharedRichText extends Struct.ComponentSchema {
  collectionName: 'components_shared_rich_texts';
  info: {
    description: '';
    displayName: 'Rich text';
    icon: 'align-justify';
  };
  attributes: {
    discription: Schema.Attribute.RichText;
    img: Schema.Attribute.Media;
    metaDescription: Schema.Attribute.RichText;
    metaTitle: Schema.Attribute.Text;
    title: Schema.Attribute.Text;
  };
}

export interface SharedSeo extends Struct.ComponentSchema {
  collectionName: 'components_shared_seos';
  info: {
    description: '';
    displayName: 'Seo';
    icon: 'allergies';
    name: 'Seo';
  };
  attributes: {
    metaDescription: Schema.Attribute.Text & Schema.Attribute.Required;
    metaTitle: Schema.Attribute.String & Schema.Attribute.Required;
    shareImage: Schema.Attribute.Media<'images'>;
  };
}

export interface SharedSlider extends Struct.ComponentSchema {
  collectionName: 'components_shared_sliders';
  info: {
    description: '';
    displayName: 'Slider';
    icon: 'address-book';
  };
  attributes: {
    files: Schema.Attribute.Media<'images', true>;
  };
}

declare module '@strapi/strapi' {
  export module Public {
    export interface ComponentSchemas {
      'blocks.hero': BlocksHero;
      'blogs.blogs': BlogsBlogs;
      'sections.feature-item': SectionsFeatureItem;
      'sections.testimonial-item': SectionsTestimonialItem;
      'shared.media': SharedMedia;
      'shared.quote': SharedQuote;
      'shared.rich-text': SharedRichText;
      'shared.seo': SharedSeo;
      'shared.slider': SharedSlider;
    }
  }
}
