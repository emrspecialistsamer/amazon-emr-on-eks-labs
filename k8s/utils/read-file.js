"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.readYamlFromDir = void 0;
const fs = require("fs");
const yaml = require("js-yaml");
function readYamlFromDir(dir, cluster) {
    let previousResource;
    fs.readdirSync(dir, "utf8").forEach(file => {
        if (file != undefined && file.split('.').pop() == 'yaml') {
            let data = fs.readFileSync(dir + file, 'utf8');
            if (data != undefined) {
                let i = 0;
                yaml.loadAll(data).forEach((item) => {
                    const resource = cluster.addManifest(file.substr(0, file.length - 5) + i, item);
                    // @ts-ignore
                    if (previousResource != undefined) {
                        resource.node.addDependency(previousResource);
                    }
                    previousResource = resource;
                    i++;
                });
            }
        }
    });
}
exports.readYamlFromDir = readYamlFromDir;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVhZC1maWxlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsicmVhZC1maWxlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLHlCQUF5QjtBQUN6QixnQ0FBZ0M7QUFLaEMsU0FBZ0IsZUFBZSxDQUFDLEdBQVcsRUFBRSxPQUFxQjtJQUNoRSxJQUFJLGdCQUFvQyxDQUFDO0lBQ3pDLEVBQUUsQ0FBQyxXQUFXLENBQUMsR0FBRyxFQUFFLE1BQU0sQ0FBQyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsRUFBRTtRQUN6QyxJQUFJLElBQUksSUFBSSxTQUFTLElBQUksSUFBSSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLEVBQUUsSUFBSSxNQUFNLEVBQUU7WUFDeEQsSUFBSSxJQUFJLEdBQUcsRUFBRSxDQUFDLFlBQVksQ0FBQyxHQUFHLEdBQUcsSUFBSSxFQUFFLE1BQU0sQ0FBQyxDQUFDO1lBQy9DLElBQUksSUFBSSxJQUFJLFNBQVMsRUFBRTtnQkFDckIsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDO2dCQUNWLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsSUFBSSxFQUFFLEVBQUU7b0JBQ2xDLE1BQU0sUUFBUSxHQUFHLE9BQU8sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUM7b0JBQ2hGLGFBQWE7b0JBQ2IsSUFBSSxnQkFBZ0IsSUFBSSxTQUFTLEVBQUU7d0JBQ2pDLFFBQVEsQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLGdCQUFnQixDQUFDLENBQUE7cUJBQzlDO29CQUNELGdCQUFnQixHQUFHLFFBQVEsQ0FBQztvQkFDNUIsQ0FBQyxFQUFFLENBQUM7Z0JBQ04sQ0FBQyxDQUFDLENBQUE7YUFDSDtTQUNGO0lBQ0gsQ0FBQyxDQUFDLENBQUM7QUFDTCxDQUFDO0FBbkJELDBDQW1CQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIGZzIGZyb20gJ2ZzJztcbmltcG9ydCAqIGFzIHlhbWwgZnJvbSAnanMteWFtbCc7XG5pbXBvcnQgKiBhcyBla3MgZnJvbSAnQGF3cy1jZGsvYXdzLWVrcyc7XG5pbXBvcnQge0t1YmVybmV0ZXNNYW5pZmVzdH0gZnJvbSBcIkBhd3MtY2RrL2F3cy1la3MvbGliL2s4cy1tYW5pZmVzdFwiO1xuXG5cbmV4cG9ydCBmdW5jdGlvbiByZWFkWWFtbEZyb21EaXIoZGlyOiBzdHJpbmcsIGNsdXN0ZXI6IGVrcy5JQ2x1c3Rlcikge1xuICBsZXQgcHJldmlvdXNSZXNvdXJjZTogS3ViZXJuZXRlc01hbmlmZXN0O1xuICBmcy5yZWFkZGlyU3luYyhkaXIsIFwidXRmOFwiKS5mb3JFYWNoKGZpbGUgPT4ge1xuICAgIGlmIChmaWxlICE9IHVuZGVmaW5lZCAmJiBmaWxlLnNwbGl0KCcuJykucG9wKCkgPT0gJ3lhbWwnKSB7XG4gICAgICBsZXQgZGF0YSA9IGZzLnJlYWRGaWxlU3luYyhkaXIgKyBmaWxlLCAndXRmOCcpO1xuICAgICAgaWYgKGRhdGEgIT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIGxldCBpID0gMDtcbiAgICAgICAgeWFtbC5sb2FkQWxsKGRhdGEpLmZvckVhY2goKGl0ZW0pID0+IHtcbiAgICAgICAgICBjb25zdCByZXNvdXJjZSA9IGNsdXN0ZXIuYWRkTWFuaWZlc3QoZmlsZS5zdWJzdHIoMCwgZmlsZS5sZW5ndGggLSA1KSArIGksIGl0ZW0pO1xuICAgICAgICAgIC8vIEB0cy1pZ25vcmVcbiAgICAgICAgICBpZiAocHJldmlvdXNSZXNvdXJjZSAhPSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIHJlc291cmNlLm5vZGUuYWRkRGVwZW5kZW5jeShwcmV2aW91c1Jlc291cmNlKVxuICAgICAgICAgIH1cbiAgICAgICAgICBwcmV2aW91c1Jlc291cmNlID0gcmVzb3VyY2U7XG4gICAgICAgICAgaSsrO1xuICAgICAgICB9KVxuICAgICAgfVxuICAgIH1cbiAgfSk7XG59Il19