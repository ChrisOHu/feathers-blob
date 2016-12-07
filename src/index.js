import { extname } from 'path';
import Proto from 'uberproto';
// import errors from 'feathers-errors';
import { getBase64DataURI, parseDataURI } from 'dauria';
import toBuffer from 'concat-stream';
import mimeTypes from 'mime-types';

import { fromBuffer, bufferToHash } from './util';

class Service {
  constructor (options) {
    if (!options) {
      throw new Error('feathers-blob-store: constructor `options` must be provided');
    }

    if (!options.Model) {
      throw new Error('feathers-blob-store: constructor `options.Model` must be provided');
    }

    this.Model = options.Model;
    this.id = options.id || 'id';
  }

  extend (obj) {
    return Proto.extend(obj, this);
  }

  get (id, params, cb) {
    const ext = extname(id);
    const contentType = mimeTypes.lookup(ext);

    this.Model.createReadStream({
      key: id
    })
    .on('error', cb)
    .pipe(toBuffer(function (buffer) {
      const uri = getBase64DataURI(buffer, contentType);

      cb(null, {
        [this.id]: id,
        uri,
        size: buffer.length
      });
    }.bind(this)));
  }

  create (data, params, cb) {
    let _buffer, _mime

    const { uri, mime: _mime, buffer: _buffer } = data

    if (uri) {
      const { buffer, MIME } = parseDataURI(uri);
      _buffer = buffer
      _mime = MIME
    }

    const hash = bufferToHash(_buffer);
    const ext = mimeTypes.extension(_mime);
    id = id || `${hash}.${ext}`;

    fromBuffer(_buffer)
    .pipe(this.Model.createWriteStream({
      key: id,
      params: params.s3
    }, function () {
      cb(null, {
        [this.id]: id,
        uri,
        size: _buffer.length
      });
    }.bind(this)))
    .on('error', cb);
  }

  remove (id, params, cb) {
    this.Model.remove({
      key: id
    }, function (err) {
      cb(err, null);
    });
  }
}

export default function init (options) {
  return new Service(options);
}

init.Service = Service;
