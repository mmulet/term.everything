package wayland

import (
	"bytes"
	"image"
	"image/draw"
	_ "image/png"
	"sort"
	"time"

	"github.com/mmulet/term.everything/wayland/protocols"
)

type Desktop struct {
	Width  int
	Height int
	Stride int // bytes per row (Width * 4)

	// Back buffer as image.RGBA (Pix backed by Buffer)
	Buffer []byte
	RGBA   *image.RGBA

	IconImg *image.NRGBA

	CreatedAt                 time.Time
	WillShowAppRightAtStartup bool
}

func MakeDesktop(size Size, willShowAppRightAtStartup bool, iconPNG []byte) *Desktop {
	w := int(size.Width)
	h := int(size.Height)
	buf := make([]byte, w*h*4)

	cd := &Desktop{
		Width:  w,
		Height: h,
		Stride: w * 4,
		Buffer: buf,
		RGBA: &image.RGBA{
			Pix:    buf,
			Stride: w * 4,
			Rect:   image.Rect(0, 0, w, h),
		},
		CreatedAt:                 time.Now(),
		WillShowAppRightAtStartup: willShowAppRightAtStartup,
	}
	cd.IconImg = RgbaToBgra(DecodeIconToNRGBA(iconPNG))
	return cd
}

func RgbaToBgra(src *image.NRGBA) *image.NRGBA {
	if src == nil {
		return nil
	}
	b := src.Bounds()
	dst := image.NewNRGBA(b)
	for y := b.Min.Y; y < b.Max.Y; y++ {
		for x := b.Min.X; x < b.Max.X; x++ {
			off := src.PixOffset(x, y)
			r := src.Pix[off+0]
			g := src.Pix[off+1]
			bb := src.Pix[off+2]
			a := src.Pix[off+3]

			dstOff := dst.PixOffset(x, y)
			dst.Pix[dstOff+0] = bb
			dst.Pix[dstOff+1] = g
			dst.Pix[dstOff+2] = r
			dst.Pix[dstOff+3] = a
		}
	}
	return dst
}

func DecodeIconToNRGBA(data []byte) *image.NRGBA {
	if len(data) == 0 {
		return nil
	}
	img, _, err := image.Decode(bytes.NewReader(data))
	if err != nil {
		return nil
	}
	if rgba, ok := img.(*image.NRGBA); ok {
		return rgba
	}
	b := img.Bounds()

	rgba := image.NewNRGBA(b)
	draw.Draw(rgba, b, img, b.Min, draw.Src)
	return rgba
}

func (cd *Desktop) DrawImage(src image.Image, dx, dy int) {
	if src == nil {
		return
	}
	sb := src.Bounds()
	r := image.Rect(dx, dy, dx+sb.Dx(), dy+sb.Dy())
	draw.Draw(cd.RGBA, r, src, sb.Min, draw.Over)
}

/*
* If we will show an app right at startup,
     * we want to wait a bit before potentially
     * drawing the icon. Otherwise it will
     * flash the icon, and the show the app
     * content which is annoying.
     *
*/
func (cd *Desktop) AfterOpeningTimeout() bool {
	if !cd.WillShowAppRightAtStartup {
		return true
	}
	return time.Since(cd.CreatedAt) >= 500*time.Millisecond
}

func (cd *Desktop) Clear() {
	clear(cd.Buffer)
}

type SortedSurfaceEntry struct {
	Surface   *WlSurface
	Src       *image.RGBA
	SurfaceID protocols.ObjectID[protocols.WlSurface]
}

type SortedSurfaceEntryParentLocation struct {
	parentID protocols.ObjectID[protocols.WlSurface]
	x, y     int
}

func (cd *Desktop) DrawClients(clients []*Client) {

	sorted := make([]SortedSurfaceEntry, 0, 64)

	childToParent := make(map[protocols.ObjectID[protocols.WlSurface]]SortedSurfaceEntryParentLocation)

	for _, c := range clients {
		if c == nil {
			continue
		}
		for surface_id := range c.DrawableSurfaces() {
			surface := GetWlSurfaceObject(c, surface_id)
			if surface == nil {
				continue
			}
			tex := surface.Texture.AsRGBA()
			if tex == nil {
				continue
			}

			for _, child := range surface.ChildrenInDrawOrder {
				if child == nil {
					continue
				}
				childToParent[*child] = SortedSurfaceEntryParentLocation{
					parentID: surface_id,
					x:        int(surface.Position.X),
					y:        int(surface.Position.Y),
				}
			}

			sorted = append(sorted, SortedSurfaceEntry{
				Surface:   surface,
				Src:       tex,
				SurfaceID: surface_id,
			})
		}
	}

	sort.Slice(sorted, func(i, j int) bool {
		zi := sorted[i].Surface.Position.Z
		zj := sorted[j].Surface.Position.Z
		if zi == zj {
			return sorted[i].SurfaceID < sorted[j].SurfaceID
		}
		return zi < zj
	})

	cd.Clear()

	if len(sorted) == 0 && cd.AfterOpeningTimeout() {
		cd.DrawImage(cd.IconImg, 0, 0)
		return
	}

	for _, it := range sorted {
		/**
		 * Recursively get the position by adding
		 * all ancestor position
		 */
		x := int(it.Surface.Position.X)
		y := int(it.Surface.Position.Y)
		parent, ok := childToParent[it.SurfaceID]
		for ok {
			x += parent.x
			y += parent.y
			parent, ok = childToParent[parent.parentID]
		}
		cd.DrawImage(it.Src, x, y)
	}
}
